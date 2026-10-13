"""
tests/test_users_billing.py - end-to-end tests for per-user subscriptions and
admin user management, running the REAL app (setup_db, auth, billing,
admin users, analytics) against PostgreSQL.

Run from acpapp/backend-api with a THROWAWAY database whose name contains
"test" (the test refuses to run otherwise, because it wipes tables):

    POSTGRES_HOST=localhost POSTGRES_DB=lft_test pytest tests/test_users_billing.py -v
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

from app import app  # noqa: E402  (import after the guard)

PASSWORD = "password123"


async def _sql(stmt, values=None):
    db = Database(str(database.url))
    await db.connect()
    try:
        await db.execute(stmt, values)
    finally:
        await db.disconnect()


def sql(stmt, values=None):
    asyncio.run(_sql(stmt, values))


async def _wipe():
    db = Database(str(database.url))
    await db.connect()
    for t in ("subscription_events", "transactions", "items", "users", "organizations"):
        await db.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    await db.disconnect()


@pytest.fixture(scope="module")
def client():
    asyncio.run(_wipe())
    with TestClient(app) as c:  # runs setup_db + setup_billing_tables
        yield c


def register(c, email):
    return c.post("/api/register", json={"email": email, "password": PASSWORD})


def login(c, email):
    r = c.post("/api/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def accounts(client):
    for e in ("alice@kmitl.ac.th", "bob@kmitl.ac.th", "carol@kmitl.ac.th",
              "boss@kmitl.ac.th", "boss2@kmitl.ac.th"):
        assert register(client, e).status_code == 201
    sql("UPDATE users SET role = 'admin' WHERE email IN ('boss@kmitl.ac.th', 'boss2@kmitl.ac.th')")
    return {name: login(client, f"{name}@kmitl.ac.th") for name in ("alice", "bob", "carol", "boss")}


def role_of(c, headers):
    return c.get("/api/billing/status", headers=headers).json()


def pay(c, headers):
    r = c.post("/api/billing/checkout", headers=headers, json={"plan": "pro"})
    assert r.status_code == 200, r.text
    ref = r.json()["reference"]
    r = c.post("/api/billing/webhook", headers=headers, json={"reference": ref})
    assert r.status_code == 200, r.text
    return ref


# ------------------------------------------------------------ registration

def test_register_rejects_non_university_email(client):
    r = register(client, "someone@gmail.com")
    assert r.status_code == 400
    assert "kmitl.ac.th" in r.json()["detail"]


def test_register_normalizes_email_and_defaults_to_free(client):
    r = register(client, "  Dave@KMITL.ac.th ")
    assert r.status_code == 201
    assert r.json()["email"] == "dave@kmitl.ac.th"
    assert r.json()["role"] == "free"
    login(client, "DAVE@kmitl.ac.th")  # case-insensitive login


# ------------------------------------------------------- per-user billing

def test_payment_upgrades_only_the_payer(client, accounts):
    pay(client, accounts["alice"])
    assert role_of(client, accounts["alice"])["plan"] == "pro"
    assert role_of(client, accounts["bob"])["plan"] == "free"      # the old bug
    assert role_of(client, accounts["carol"])["plan"] == "free"


def test_cannot_confirm_someone_elses_payment(client, accounts):
    ref = client.post("/api/billing/checkout", headers=accounts["bob"], json={"plan": "pro"}).json()["reference"]
    r = client.post("/api/billing/webhook", headers=accounts["carol"], json={"reference": ref})
    assert r.status_code == 404
    assert role_of(client, accounts["bob"])["plan"] == "free"


def test_pro_user_cannot_buy_again(client, accounts):
    r = client.post("/api/billing/checkout", headers=accounts["alice"], json={"plan": "pro"})
    assert r.status_code == 409


def test_admin_cannot_subscribe(client, accounts):
    status = role_of(client, accounts["boss"])
    assert status["is_admin"] and status["plan"] is None
    r = client.post("/api/billing/checkout", headers=accounts["boss"], json={"plan": "pro"})
    assert r.status_code == 403


def test_cancel_subscription(client, accounts):
    pay(client, accounts["carol"])
    r = client.post("/api/billing/cancel", headers=accounts["carol"])
    assert r.status_code == 200
    assert role_of(client, accounts["carol"])["plan"] == "free"
    assert client.post("/api/billing/cancel", headers=accounts["carol"]).status_code == 409


def test_analytics_billing_reflects_subscriptions(client, accounts):
    b = client.get("/api/admin/analytics", headers=accounts["boss"]).json()["billing"]
    # alice is Pro; carol paid then cancelled; free = bob, carol, dave and
    # the demo@example.com account that setup_db always creates
    assert b["pro_users"] == 1
    assert b["free_users"] == 4
    assert b["mrr"] == 99.0 and b["arr"] == 1188.0
    assert b["conversion_rate"] == 20.0
    assert b["cancellations_30d"] == 1
    assert b["paid_transactions"] == 2 and b["transaction_volume"] == 198.0


# -------------------------------------------------- admin user management

def test_non_admin_cannot_manage_users(client, accounts):
    assert client.get("/api/admin/users", headers=accounts["alice"]).status_code == 403
    assert client.patch("/api/admin/users/bob@kmitl.ac.th", headers=accounts["alice"],
                        json={"plan": "pro"}).status_code == 403


def test_list_users(client, accounts):
    users = {u["email"]: u for u in client.get("/api/admin/users", headers=accounts["boss"]).json()}
    assert users["alice@kmitl.ac.th"]["role"] == "pro"
    assert users["alice@kmitl.ac.th"]["payments"] == 1
    assert users["alice@kmitl.ac.th"]["can_delete"] is False   # has a payment
    assert users["dave@kmitl.ac.th"]["can_delete"] is True
    assert users["boss@kmitl.ac.th"]["can_delete"] is False    # admin
    assert all(users[f"{n}@kmitl.ac.th"]["last_login_at"] for n in ("alice", "bob", "carol", "boss"))


def test_admin_grant_and_revoke_pro(client, accounts):
    r = client.patch("/api/admin/users/bob@kmitl.ac.th", headers=accounts["boss"], json={"plan": "pro"})
    assert r.status_code == 200 and r.json()["role"] == "pro"
    assert role_of(client, accounts["bob"])["plan"] == "pro"
    r = client.patch("/api/admin/users/bob@kmitl.ac.th", headers=accounts["boss"], json={"plan": "free"})
    assert r.json()["role"] == "free"


def test_admin_cannot_change_self_or_other_admins(client, accounts):
    assert client.patch("/api/admin/users/boss@kmitl.ac.th", headers=accounts["boss"],
                        json={"is_active": False}).status_code == 400
    assert client.patch("/api/admin/users/boss2@kmitl.ac.th", headers=accounts["boss"],
                        json={"is_active": False}).status_code == 403


def test_deactivate_logs_out_and_blocks_login(client, accounts):
    r = client.patch("/api/admin/users/bob@kmitl.ac.th", headers=accounts["boss"], json={"is_active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert client.get("/api/billing/status", headers=accounts["bob"]).status_code == 401  # token cleared
    r = client.post("/api/login", json={"email": "bob@kmitl.ac.th", "password": PASSWORD})
    assert r.status_code == 403
    a = client.get("/api/admin/analytics", headers=accounts["boss"]).json()["users"]
    assert a["deactivated_users"] == 1
    # reactivate
    client.patch("/api/admin/users/bob@kmitl.ac.th", headers=accounts["boss"], json={"is_active": True})
    accounts["bob"] = login(client, "bob@kmitl.ac.th")


def test_bulk_deactivate_inactive(client, accounts):
    sql("""UPDATE users SET create_at = NOW() - INTERVAL '200 days',
                            last_login_at = NOW() - INTERVAL '120 days'
           WHERE email = 'dave@kmitl.ac.th'""")
    preview = client.post("/api/admin/users/deactivate-inactive", headers=accounts["boss"],
                          json={"days": 90, "dry_run": True}).json()
    assert preview["emails"] == ["dave@kmitl.ac.th"]
    still = {u["email"]: u for u in client.get("/api/admin/users", headers=accounts["boss"]).json()}
    assert still["dave@kmitl.ac.th"]["is_active"] is True     # dry run changed nothing
    done = client.post("/api/admin/users/deactivate-inactive", headers=accounts["boss"],
                       json={"days": 90}).json()
    assert done["count"] == 1
    deact = client.get("/api/admin/users?status=deactivated", headers=accounts["boss"]).json()
    assert [u["email"] for u in deact] == ["dave@kmitl.ac.th"]


def test_delete_only_users_without_history(client, accounts):
    r = client.post("/api/items", headers=accounts["bob"], json={
        "type": "lost", "name": "Umbrella", "category": "Apparel", "location": "Main Library"})
    assert r.status_code == 201, r.text
    assert client.delete("/api/admin/users/bob@kmitl.ac.th", headers=accounts["boss"]).status_code == 409
    assert client.delete("/api/admin/users/dave@kmitl.ac.th", headers=accounts["boss"]).status_code == 200
    emails = [u["email"] for u in client.get("/api/admin/users", headers=accounts["boss"]).json()]
    assert "dave@kmitl.ac.th" not in emails
    assert client.delete("/api/admin/users/nobody@kmitl.ac.th", headers=accounts["boss"]).status_code == 404


def test_analytics_still_works(client, accounts):
    body = client.get("/api/admin/analytics", headers=accounts["boss"]).json()
    assert body["summary"]["total_items"] == 1
    assert body["users"]["users_by_role"] == {"admin": 2, "free": 3, "pro": 1}  # free incl. demo@example.com
