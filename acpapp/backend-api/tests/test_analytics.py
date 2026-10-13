"""
tests/test_analytics.py - integration test for GET /api/admin/analytics
against a real PostgreSQL database using Kullatida's items schema.

Run from acpapp/backend-api:   pytest tests/test_analytics.py -v

WARNING: this test DROPS and recreates the organizations/users/items/
transactions tables. It uses the same connection as database.py, and it
refuses to run unless that database's name contains "test" - point
database.py at a separate test database (e.g. lft_test) when running it.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from databases import Database
from fastapi.testclient import TestClient

from database import database
from routes.analytics import require_admin, router


@asynccontextmanager
async def lifespan(_app):
    # Same as app.py: open the shared connection inside the app's event loop.
    await database.connect()
    yield
    await database.disconnect()

app = FastAPI(lifespan=lifespan)
app.include_router(router, prefix="/api")

# Skip real JWT login in tests: pretend an org-1 admin is signed in.
TEST_ADMIN = {"email": "admin@kmitl.ac.th", "role": "admin", "organization_id": 1}
NOW = datetime.now(timezone.utc)


DB_URL = str(database.url)

if "test" not in (database.url.database or ""):
    pytest.skip(
        f"Refusing to run: database '{database.url.database}' is not a test database "
        "(its name must contain 'test'). This test drops tables.",
        allow_module_level=True,
    )


async def _sql(*statements):
    """Run setup SQL on a separate short-lived connection."""
    db = Database(DB_URL)
    await db.connect()
    try:
        for stmt, *vals in statements:
            await db.execute(stmt, vals[0] if vals else None)
    finally:
        await db.disconnect()


def run_sql(*statements):
    asyncio.run(_sql(*statements))


async def _seed():
    database = Database(DB_URL)
    await database.connect()
    for t in ("subscription_events", "transactions", "items", "users", "organizations"):
        await database.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    await database.execute("CREATE TABLE organizations (id SERIAL PRIMARY KEY, slug TEXT UNIQUE)")
    await database.execute("INSERT INTO organizations (slug) VALUES ('kmitl'), ('other')")
    await database.execute("""
        CREATE TABLE users (email VARCHAR(255) PRIMARY KEY, password TEXT,
            organization_id INTEGER NOT NULL REFERENCES organizations(id), role VARCHAR(10),
            is_active BOOLEAN NOT NULL DEFAULT TRUE, last_login_at TIMESTAMPTZ)""")
    await database.execute("""
        CREATE TABLE items (
            item_id UUID PRIMARY KEY,
            organization_id INTEGER NOT NULL REFERENCES organizations(id),
            reported_by VARCHAR(255) NOT NULL REFERENCES users(email),
            type VARCHAR(10) NOT NULL CHECK (type IN ('lost','found')),
            name VARCHAR(200) NOT NULL, category VARCHAR(100) NOT NULL,
            location VARCHAR(200) NOT NULL, description TEXT, photo_url TEXT,
            contact VARCHAR(255) NOT NULL,
            status VARCHAR(10) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','claimed','archived')),
            date_reported TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
    users = [("admin@kmitl.ac.th", 1, "admin"), ("a@kmitl.ac.th", 1, "free"),
             ("b@kmitl.ac.th", 1, "pro"), ("x@other.ac.th", 2, "free")]
    for email, org, role in users:
        await database.execute("INSERT INTO users (email, password, organization_id, role) "
                               "VALUES (:e, 'x', :o, :r)",
                               {"e": email, "o": org, "r": role})

    # (type, name, category, location, status, reported_days_ago, claimed_after_days, reporter, org)
    rows = [
        ("found", "Anker power bank", "Electronics", "Main Library",  "claimed", 10, 2, "a@kmitl.ac.th", 1),
        ("lost",  "Wired earphones",  "Electronics", "Main Gate",     "open",     1, None, "b@kmitl.ac.th", 1),
        ("found", "Student ID card",  "Documents",   "Eng. Building", "claimed",  6, 4, "a@kmitl.ac.th", 1),
        ("lost",  "Blue umbrella",    "Apparel",     "Cafeteria",     "open",    40, None, "b@kmitl.ac.th", 1),
        ("lost",  "Laptop bag",       "Bags",        "Main Library",  "open",     0, None, "admin@kmitl.ac.th", 1),
        ("found", "Old phone",        "Electronics", "Main Library",  "archived", 3, None, "a@kmitl.ac.th", 1),
        ("lost",  "Other org wallet", "Bags",        "Elsewhere",     "open",     0, None, "x@other.ac.th", 2),
    ]
    for typ, name, cat, loc, status, ago, claimed_after, rep, org in rows:
        reported = NOW - timedelta(days=ago)
        updated = reported + timedelta(days=claimed_after) if claimed_after else reported
        await database.execute(
            """INSERT INTO items (item_id, organization_id, reported_by, type, name, category,
                   location, contact, status, date_reported, updated_at)
               VALUES (:id, :org, :rep, :t, :n, :c, :l, :rep, :s, :d, :u)""",
            {"id": uuid4(), "org": org, "rep": rep, "t": typ, "n": name, "c": cat,
             "l": loc, "s": status, "d": reported, "u": updated})
    await database.disconnect()


@pytest.fixture(scope="module")
def client():
    asyncio.run(_seed())
    app.dependency_overrides[require_admin] = lambda: TEST_ADMIN
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def get(client, **params):
    return client.get("/api/admin/analytics", params=params)


def test_requires_login():
    """Without the override, the real require_role("admin") must reject a
    request that has no token (401 or 403, depending on deps.py)."""
    with TestClient(app) as c:
        saved = dict(app.dependency_overrides)
        app.dependency_overrides.clear()
        try:
            assert c.get("/api/admin/analytics").status_code in (401, 403)
        finally:
            app.dependency_overrides.update(saved)


def test_other_org_admin_sees_only_their_org(client):
    app.dependency_overrides[require_admin] = lambda: {**TEST_ADMIN, "organization_id": 2}
    try:
        s = get(client).json()["summary"]
        assert s["total_items"] == 1        # only the other org's wallet
    finally:
        app.dependency_overrides[require_admin] = lambda: TEST_ADMIN


def test_summary(client):
    s = get(client).json()["summary"]
    # 5 non-archived items in org 1; archived one and org 2's item are excluded
    assert s["total_items"] == 5
    assert (s["total_lost"], s["total_found"]) == (3, 2)
    assert (s["open_lost"], s["open_found"]) == (3, 0)
    assert (s["recovered"], s["recovered_found"], s["recovered_lost"]) == (2, 2, 0)
    assert s["recovery_rate"] == 40.0            # 2 / 5
    assert s["avg_match_time_days"] == 3.0       # claimed after 2 and 4 days


def test_items_by_category_sorted_biggest_first(client):
    cats = get(client).json()["items_by_category"]
    assert cats[0] == {"category": "Electronics", "count": 2}
    assert {c["category"] for c in cats} == {"Electronics", "Documents", "Apparel", "Bags"}


def test_by_location(client):
    locs = {r["location"]: r for r in get(client).json()["by_location"]}
    assert locs["Main Library"] == {"location": "Main Library", "lost": 1, "found": 1}
    assert "Elsewhere" not in locs                # other organization


def test_items_over_time_has_every_day(client):
    series = get(client, days=7).json()["items_over_time"]
    assert len(series) == 7
    assert series[-1]["day"] == NOW.date().isoformat()
    assert sum(d["lost"] + d["found"] for d in series) == 3   # items within last 7 days


def test_recent_activity_newest_first(client):
    feed = get(client, recent_limit=3).json()["recent_activity"]
    assert [f["name"] for f in feed] == ["Laptop bag", "Wired earphones", "Student ID card"]


def test_users(client):
    u = get(client).json()["users"]
    assert u["total_users"] == 3
    assert u["active_users_30d"] == 3          # all three reported an item in 30 days
    assert u["deactivated_users"] == 0
    assert u["users_by_role"] == {"admin": 1, "free": 1, "pro": 1}


def test_billing_none_until_transactions_table_exists(client):
    assert get(client).json()["billing"] is None


def test_billing_once_table_exists(client):
    # Same shape as routes/billing.py's transactions table.
    run_sql(("""
        CREATE TABLE transactions (id SERIAL PRIMARY KEY, user_email VARCHAR(255),
            organization_id INTEGER, tier VARCHAR(20), amount NUMERIC,
            status VARCHAR(10), reference VARCHAR(40), created_at TIMESTAMPTZ DEFAULT NOW())""",), ("""
        INSERT INTO transactions (user_email, organization_id, tier, amount, status, created_at) VALUES
        ('b@kmitl.ac.th', 1, 'pro', 199, 'paid',    NOW()),
        ('b@kmitl.ac.th', 1, 'pro', 199, 'paid',    NOW() - INTERVAL '45 days'),
        ('a@kmitl.ac.th', 1, 'pro', 199, 'pending', NOW()),
        ('x@other.ac.th', 2, 'pro', 999, 'paid',    NOW())""",))
    b = get(client).json()["billing"]
    # MRR follows who is on Pro now (b), not past payments: 1 x PRO_PRICE (99).
    # Org 1 non-admins: a (free), b (pro) -> 50% conversion.
    assert b == {"mrr": 99.0, "arr": 1188.0, "pro_users": 1, "free_users": 1,
                 "conversion_rate": 50.0, "cancellations_30d": 0,
                 "paid_transactions": 2, "transaction_volume": 398.0}


def test_invalid_params_rejected(client):
    assert get(client, days=3).status_code == 422
    assert get(client, recent_limit=0).status_code == 422
