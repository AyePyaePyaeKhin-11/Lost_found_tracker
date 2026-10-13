"""FastAPI/JWT/permission tests with an in-memory SQL test double.
These tests do not connect to or modify PostgreSQL. Run with:
    python -m pytest tests/test_items_week3.py -q
Live database verification remains covered by smoke_items.py.
"""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import auth_dependencies
from routes import items
from routes.auth import ALGORITHM, SECRET_KEY


class MemoryDatabase:
    """A deliberately small SQL double, not a PostgreSQL substitute."""
    def __init__(self):
        self.users = {}
        self.rows = {}

    async def fetch_one(self, query, values):
        if "FROM users" in query:
            return self.users.get(values["email"])
        now = datetime.now(timezone.utc)
        if "INSERT INTO items" in query:
            key = values["item_id"]
            if key in self.rows:
                raise items.UniqueViolationError("duplicate")
            self.rows[key] = {**values, "status": "open", "date_reported": now,
                              "created_at": now, "updated_at": now,
                              "claimed_at": None, "archived_at": None}
            return deepcopy(self.rows[key])
        # All Item reads/mutations must bind the tenant in SQL.
        assert "organization_id = :organization_id" in query
        row = self.rows.get(values["item_id"])
        if row is None or row["organization_id"] != values["organization_id"]:
            return None
        if "UPDATE items" in query:
            assert "status = 'open'" in query
            if row["status"] != "open":
                return None
            if "SET status = 'claimed'" in query:
                assert "claimed_at = NOW()" in query
                row.update(status="claimed", claimed_at=now)
            elif "SET status = 'archived'" in query:
                assert "archived_at = NOW()" in query
                row.update(status="archived", archived_at=now)
            else:
                row.update({k: v for k, v in values.items()
                            if k not in ("item_id", "organization_id")})
            row["updated_at"] = now
        return deepcopy(row)

    async def fetch_all(self, query, values):
        assert "organization_id = :organization_id" in query
        rows = [deepcopy(r) for r in self.rows.values()
                if r["organization_id"] == values["organization_id"]]
        for column, key in (("status", "item_status"), ("type", "type"),
                            ("colour", "colour"), ("brand", "brand")):
            if key in values:
                rows = [r for r in rows if r[column] == values[key]]
        for key in ("category", "location"):
            if key in values:
                rows = [r for r in rows if values[key].strip("%").lower() in r[key].lower()]
        return sorted(rows, key=lambda r: r["date_reported"], reverse=True)


@pytest.fixture
def env(monkeypatch):
    db = MemoryDatabase()
    monkeypatch.setattr(items, "database", db)
    monkeypatch.setattr(auth_dependencies, "database", db)
    headers = {}
    for who, org, role in (("owner", 1, "student"), ("peer", 1, "student"),
                           ("admin", 1, "admin"), ("outside", 2, "admin")):
        email = f"{who}@example.com"
        token = jwt.encode({"sub": email, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                           SECRET_KEY, algorithm=ALGORITHM)
        db.users[email] = dict(email=email, organization_id=org, role=role, token=token)
        headers[who] = {"Authorization": f"Bearer {token}"}
    app = FastAPI()
    app.include_router(items.router, prefix="/api")
    with TestClient(app) as client:
        yield client, headers, db


def create(env, **changes):
    c, h, _ = env
    r = c.post("/api/items", headers=h["owner"], json={
        "type": "lost", "name": "Umbrella", "category": "Accessories",
        "location": "Central Library", "colour": "Black", "brand": "Acme", **changes})
    assert r.status_code == 201, r.text
    return r.json()


def test_fields_and_filters(env):
    c, h, _ = env
    row = create(env, colour=" Black ", brand=" Acme ")
    assert (row["colour"], row["brand"]) == ("Black", "Acme")
    assert row["created_at"] and row["claimed_at"] is None and row["archived_at"] is None
    assert row["contact"] == "owner@example.com"
    r = c.get("/api/items?item_type=lost&colour=Black&brand=Acme&location=Library", headers=h["owner"])
    assert [x["item_id"] for x in r.json()] == [row["item_id"]]
    assert c.get("/api/items?item_type=found", headers=h["owner"]).json() == []


@pytest.mark.parametrize("method,suffix,body", [
    ("GET", "", None), ("PATCH", "", {"name": "New"}),
    ("PATCH", "/claim", None), ("DELETE", "", None)])
def test_cross_organization_hidden(env, method, suffix, body):
    c, h, _ = env
    row = create(env)
    assert c.request(method, f'/api/items/{row["item_id"]}{suffix}',
                     headers=h["outside"], json=body).status_code == 404
    assert c.get("/api/items", headers=h["outside"]).json() == []
    assert c.get("/api/admin/items", headers=h["outside"]).json() == []


@pytest.mark.parametrize("method,suffix,body", [
    ("PATCH", "", {"name": "New"}), ("PATCH", "/claim", None), ("DELETE", "", None)])
def test_non_owner_cannot_mutate(env, method, suffix, body):
    c, h, _ = env
    row = create(env)
    assert c.request(method, f'/api/items/{row["item_id"]}{suffix}',
                     headers=h["peer"], json=body).status_code == 403


@pytest.mark.parametrize("actor", ["owner", "admin"])
def test_claim_time_and_terminal_state(env, actor):
    c, h, _ = env
    row = create(env)
    path = f'/api/items/{row["item_id"]}'
    changed = c.patch(path, headers=h[actor], json={"brand": None, "colour": "Blue"})
    assert changed.status_code == 200 and changed.json()["brand"] is None
    claimed = c.patch(path + "/claim", headers=h[actor])
    assert claimed.status_code == 200
    assert claimed.json()["claimed_at"] == claimed.json()["updated_at"]
    assert claimed.json()["created_at"] == row["created_at"]
    for method, suffix, body in (("PATCH", "/claim", None), ("DELETE", "", None),
                                 ("PATCH", "", {"name": "Changed"})):
        assert c.request(method, path + suffix, headers=h[actor], json=body).status_code == 409
    assert c.get(path, headers=h[actor]).json()["claimed_at"] == claimed.json()["claimed_at"]


@pytest.mark.parametrize("actor", ["owner", "admin"])
def test_archive_terminal_state(env, actor):
    c, h, _ = env
    path = '/api/items/' + create(env)["item_id"]
    archived = c.delete(path, headers=h[actor])
    assert archived.status_code == 200 and archived.json()["archived_at"]
    assert c.patch(path + "/claim", headers=h[actor]).status_code == 409
    assert c.delete(path, headers=h[actor]).status_code == 409
    assert c.patch(path, headers=h[actor], json={"name": "New"}).status_code == 409


def test_admin_dependency(env):
    c, h, _ = env
    row = create(env)
    assert c.get("/api/admin/items", headers=h["peer"]).status_code == 403
    assert c.get("/api/admin/items").status_code == 401
    assert c.get("/api/admin/items", headers=h["admin"]).json()[0]["item_id"] == row["item_id"]


@pytest.mark.parametrize("body", [{"colour": " "}, {"brand": "x" * 101},
    {"organization_id": 2}, {"reported_by": "peer@example.com"},
    {"status": "claimed"}, {"claimed_at": "2026-10-01T00:00:00Z"}, {"name": None}])
def test_invalid_updates(env, body):
    c, h, _ = env
    path = '/api/items/' + create(env)["item_id"]
    assert c.patch(path, headers=h["owner"], json=body).status_code == 422


def test_duplicate_missing_and_bad_ids(env):
    c, h, _ = env
    row = create(env)
    r = c.post('/api/items', headers=h["owner"], json={"item_id": row["item_id"],
        "type": "lost", "name": "Duplicate", "category": "Keys", "location": "Library"})
    assert r.status_code == 409
    assert c.get('/api/items/' + str(uuid4()), headers=h["owner"]).status_code == 404
    assert c.get('/api/items/not-a-uuid', headers=h["owner"]).status_code == 422


@pytest.mark.parametrize("token", ["bad-token", "expired", "revoked", "forged-role"])
def test_real_auth_rejects_bad_tokens_and_ignores_jwt_role(env, token):
    c, h, db = env
    if token == "expired":
        token = jwt.encode({"sub": "owner@example.com", "exp": 1}, SECRET_KEY, algorithm=ALGORITHM)
    elif token == "revoked":
        db.users["owner@example.com"]["token"] = "replacement"
        token = h["owner"]["Authorization"].split()[1]
    elif token == "forged-role":
        token = jwt.encode({"sub": "peer@example.com", "role": "admin",
            "exp": datetime.now(timezone.utc)+timedelta(hours=1)}, SECRET_KEY, algorithm=ALGORITHM)
        db.users["peer@example.com"]["token"] = token
        assert c.get('/api/admin/items', headers={"Authorization": 'Bearer '+token}).status_code == 403
        return
    assert c.get('/api/items', headers={"Authorization": 'Bearer '+token}).status_code == 401
