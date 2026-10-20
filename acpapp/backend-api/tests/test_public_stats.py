"""
tests/test_public_stats.py - GET /api/stats/public (live numbers for the home page).

Run from acpapp/backend-api with a THROWAWAY database whose name contains "test":

    JWT_SECRET=... POSTGRES_HOST=localhost POSTGRES_DB=lft_test pytest tests/test_public_stats.py -v
"""

import asyncio

import pytest
from databases import Database
from fastapi.testclient import TestClient

from database import database

if "test" not in (database.url.database or ""):
    pytest.skip(
        f"Refusing to run: database '{database.url.database}' is not a test database.",
        allow_module_level=True,
    )

from app import app  # noqa: E402

PASSWORD = "password123"


async def _run(stmts):
    db = Database(str(database.url))
    await db.connect()
    try:
        for stmt, values in stmts:
            await db.execute(stmt, values)
    finally:
        await db.disconnect()


def sql(stmt, values=None):
    asyncio.run(_run([(stmt, values)]))


@pytest.fixture(scope="module")
def client():
    asyncio.run(_run([(f"DROP TABLE IF EXISTS {t} CASCADE", None) for t in
                      ("subscription_events", "transactions", "items", "users", "organizations")]))
    with TestClient(app) as c:
        yield c


def login(c, email):
    assert c.post("/api/register", json={"email": email, "password": PASSWORD}).status_code == 201
    r = c.post("/api/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def report(c, headers, type_, name, location="Main Library"):
    r = c.post("/api/items", headers=headers, json={
        "type": type_, "name": name, "category": "Electronics",
        "location": location, "description": "secret detail", "contact": "0899999999",
    })
    assert r.status_code == 201, r.text
    return r.json()["item_id"]


def test_empty_campus_shows_zeros(client):
    r = client.get("/api/stats/public")
    assert r.status_code == 200
    body = r.json()
    assert (body["lost_open"], body["found_open"], body["recovered"]) == (0, 0, 0)
    assert body["recent_found"] == [] and body["recent_lost"] == []


def test_counts_and_recent_items(client):
    me = login(client, "stats@kmitl.ac.th")
    sql("UPDATE users SET role = 'pro' WHERE email = 'stats@kmitl.ac.th'")  # Free allows only 3 lost/month
    for n in ("Lost 1", "Lost 2", "Lost 3", "Lost 4"):
        report(client, me, "lost", n)
    claimed = report(client, me, "found", "Found returned")
    report(client, me, "found", "Found 1", "HM Building")
    assert client.patch(f"/api/items/{claimed}/claim", headers=me).status_code == 200

    # works without logging in
    body = client.get("/api/stats/public").json()
    assert body["lost_open"] == 4
    assert body["found_open"] == 1          # the claimed one is not open
    assert body["recovered"] == 1
    assert body["organization"]

    # newest first, at most 3, only open reports
    assert [i["name"] for i in body["recent_lost"]] == ["Lost 4", "Lost 3", "Lost 2"]
    assert [i["name"] for i in body["recent_found"]] == ["Found 1"]

    # only safe fields: no description, contact or reporter
    assert set(body["recent_lost"][0]) == {"name", "location", "date_reported"}

    # the same numbers when logged in
    logged_in = client.get("/api/stats/public", headers=me).json()
    assert logged_in["lost_open"] == 4 and logged_in["recovered"] == 1


def test_bad_token_still_works(client):
    r = client.get("/api/stats/public", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 200
    assert r.json()["lost_open"] == 4


def test_other_organization_is_not_counted(client):
    sql("INSERT INTO organizations (slug, name) VALUES ('other', 'Other Campus') ON CONFLICT DO NOTHING")
    other = login(client, "outsider@kmitl.ac.th")
    sql("UPDATE users SET organization_id = (SELECT id FROM organizations WHERE slug = 'other') "
        "WHERE email = 'outsider@kmitl.ac.th'")
    report(client, other, "lost", "Other campus item")

    public = client.get("/api/stats/public").json()          # default campus
    assert public["lost_open"] == 4

    theirs = client.get("/api/stats/public", headers=other).json()
    assert theirs["lost_open"] == 1
    assert theirs["organization"] == "Other Campus"
