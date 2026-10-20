"""
tests/test_lost_report_limit.py - Free plan: 3 LOST reports per calendar month.
Found reports are unlimited for everyone; Pro and admin are unlimited.

Run from acpapp/backend-api with a THROWAWAY database whose name contains "test":

    JWT_SECRET=... POSTGRES_HOST=localhost POSTGRES_DB=lft_test pytest tests/test_lost_report_limit.py -v
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
from routes.billing import FREE_LOST_REPORTS_PER_MONTH, PRO_PRICE  # noqa: E402

PASSWORD = "password123"


async def _run(stmt, values=None):
    db = Database(str(database.url))
    await db.connect()
    try:
        await db.execute(stmt, values)
    finally:
        await db.disconnect()


def sql(stmt, values=None):
    asyncio.run(_run(stmt, values))


@pytest.fixture(scope="module")
def client():
    for t in ("subscription_events", "transactions", "items", "users", "organizations"):
        sql(f"DROP TABLE IF EXISTS {t} CASCADE")
    with TestClient(app) as c:
        yield c


def account(c, email, role=None):
    assert c.post("/api/register", json={"email": email, "password": PASSWORD}).status_code == 201
    if role:
        sql("UPDATE users SET role = :r WHERE email = :e", {"r": role, "e": email})
    r = c.post("/api/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def report(c, headers, type_, name="Item"):
    return c.post("/api/items", headers=headers, json={
        "type": type_, "name": name, "category": "Electronics", "location": "Main Library",
    })


def status(c, headers):
    return c.get("/api/billing/status", headers=headers).json()


def test_settings():
    assert FREE_LOST_REPORTS_PER_MONTH == 3
    assert PRO_PRICE == 149


def test_free_user_gets_three_lost_reports_a_month(client):
    me = account(client, "free1@kmitl.ac.th")
    assert status(client, me)["lost_reports_used"] == 0
    assert status(client, me)["lost_reports_limit"] == 3
    for i in range(3):
        assert report(client, me, "lost", f"Lost {i}").status_code == 201
    assert status(client, me)["lost_reports_used"] == 3

    r = report(client, me, "lost", "One too many")
    assert r.status_code == 403
    assert "Upgrade to Pro" in r.json()["detail"]


def test_found_reports_are_never_limited(client):
    me = account(client, "finder@kmitl.ac.th")
    for i in range(6):
        assert report(client, me, "found", f"Found {i}").status_code == 201
    # found reports don't use up lost slots
    assert status(client, me)["lost_reports_used"] == 0
    assert report(client, me, "lost").status_code == 201


def test_deleting_does_not_give_the_slot_back(client):
    me = account(client, "deleter@kmitl.ac.th")
    ids = [report(client, me, "lost", f"L{i}").json()["item_id"] for i in range(3)]
    assert client.delete(f"/api/items/{ids[0]}", headers=me).status_code == 200
    assert report(client, me, "lost").status_code == 403


def test_last_months_reports_do_not_count(client):
    me = account(client, "oldmonth@kmitl.ac.th")
    for i in range(3):
        assert report(client, me, "lost", f"L{i}").status_code == 201
    sql("UPDATE items SET created_at = created_at - INTERVAL '40 days' "
        "WHERE reported_by = 'oldmonth@kmitl.ac.th'")
    assert status(client, me)["lost_reports_used"] == 0
    assert report(client, me, "lost").status_code == 201


def test_pro_and_admin_are_unlimited(client):
    pro = account(client, "pro1@kmitl.ac.th", role="pro")
    boss = account(client, "boss1@kmitl.ac.th", role="admin")
    for h in (pro, boss):
        assert status(client, h)["lost_reports_limit"] is None
        for i in range(5):
            assert report(client, h, "lost", f"L{i}").status_code == 201


def test_upgrading_removes_the_limit(client):
    me = account(client, "upgrader@kmitl.ac.th")
    for i in range(3):
        report(client, me, "lost", f"L{i}")
    assert report(client, me, "lost").status_code == 403

    r = client.post("/api/billing/checkout", headers=me, json={"plan": "pro"})
    assert r.status_code == 200 and float(r.json()["amount"]) == 149
    client.post("/api/billing/webhook", headers=me, json={"reference": r.json()["reference"]})
    assert status(client, me)["plan"] == "pro"
    assert report(client, me, "lost").status_code == 201
