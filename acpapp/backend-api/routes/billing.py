"""
routes/billing.py

Per-user subscriptions with a mock PromptPay checkout.

Plans live on each user in users.role:
    free   - default for every new account
    pro    - paid plan (PRO_PRICE THB / month)
    admin  - staff account; manages users and subscriptions, never subscribes

Flow:
    POST /api/billing/checkout   free user creates a pending transaction + QR payload
    POST /api/billing/webhook    simulated payment callback: marks the transaction
                                 paid and upgrades ONLY that user to pro
    POST /api/billing/cancel     pro user cancels; back to free immediately
    GET  /api/billing/status     the caller's own plan

Every upgrade / cancellation (and admin grant / revoke, see admin_users.py)
is written to subscription_events, so the admin dashboard can report
cancellations and MRR reflects who is currently on Pro.
"""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_dependencies import current_user
from database import database

router = APIRouter(tags=["billing"])

# Simulated price in THB per user per month.
PRO_PRICE = 99
PLAN_PRICES = {"pro": PRO_PRICE}


async def setup_billing_tables():
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            organization_id INTEGER NOT NULL REFERENCES organizations(id),
            user_email VARCHAR(255) NOT NULL REFERENCES users(email),
            amount NUMERIC(10, 2) NOT NULL,
            tier VARCHAR(20) NOT NULL,
            payment_method VARCHAR(30) NOT NULL DEFAULT 'mock_promptpay',
            status VARCHAR(10) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid')),
            reference VARCHAR(40) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            paid_at TIMESTAMPTZ
        )
        """
    )
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS subscription_events (
            id SERIAL PRIMARY KEY,
            organization_id INTEGER NOT NULL REFERENCES organizations(id),
            user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
            event VARCHAR(20) NOT NULL
                CHECK (event IN ('upgraded', 'cancelled', 'granted', 'revoked')),
            actor_email VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


async def log_subscription_event(user_email: str, organization_id: int, event: str, actor_email: str):
    await database.execute(
        """
        INSERT INTO subscription_events (organization_id, user_email, event, actor_email)
        VALUES (:org, :email, :event, :actor)
        """,
        {"org": organization_id, "email": user_email, "event": event, "actor": actor_email},
    )


class CheckoutRequest(BaseModel):
    plan: Literal["pro"] = "pro"


class WebhookRequest(BaseModel):
    reference: str


@router.get("/billing/status")
async def billing_status(user=Depends(current_user)):
    org = await database.fetch_one(
        "SELECT name FROM organizations WHERE id = :id",
        {"id": user["organization_id"]},
    )
    role = user["role"]
    return {
        "email": user["email"],
        "organization": org["name"] if org else None,
        "role": role,
        "plan": role if role in ("free", "pro") else None,  # admins have no plan
        "is_admin": role == "admin",
        "pro_price": PRO_PRICE,
    }


@router.post("/billing/checkout")
async def checkout(payload: CheckoutRequest, user=Depends(current_user)):
    if user["role"] == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts manage subscriptions and can't subscribe.",
        )
    if user["role"] == payload.plan:
        raise HTTPException(status_code=409, detail="You are already on the Pro plan.")

    amount = PLAN_PRICES[payload.plan]
    reference = "PP-" + uuid.uuid4().hex[:12].upper()
    await database.execute(
        """
        INSERT INTO transactions (organization_id, user_email, amount, tier, reference)
        VALUES (:org, :email, :amount, :tier, :reference)
        """,
        {
            "org": user["organization_id"],
            "email": user["email"],
            "amount": amount,
            "tier": payload.plan,
            "reference": reference,
        },
    )
    return {
        "reference": reference,
        "amount": amount,
        "currency": "THB",
        "plan": payload.plan,
        "qr_payload": f"MOCK-PROMPTPAY|{reference}|{amount}",
        "status": "pending",
    }


@router.post("/billing/webhook")
async def webhook(payload: WebhookRequest, user=Depends(current_user)):
    # Simulates the payment provider calling back after the QR is "scanned".
    # Only the user who started the checkout can confirm it.
    txn = await database.fetch_one(
        "SELECT * FROM transactions WHERE reference = :ref AND user_email = :email",
        {"ref": payload.reference, "email": user["email"]},
    )
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn["status"] == "paid":
        return {"status": "paid", "plan": txn["tier"], "message": "Already confirmed"}

    async with database.transaction():
        await database.execute(
            "UPDATE transactions SET status = 'paid', paid_at = NOW() WHERE id = :id",
            {"id": txn["id"]},
        )
        # Upgrade ONLY the paying user (never admins, never anyone else).
        await database.execute(
            "UPDATE users SET role = :plan WHERE email = :email AND role = 'free'",
            {"plan": txn["tier"], "email": user["email"]},
        )
        await log_subscription_event(user["email"], user["organization_id"], "upgraded", user["email"])
    return {"status": "paid", "plan": txn["tier"], "message": "Upgrade complete"}


@router.post("/billing/cancel")
async def cancel(user=Depends(current_user)):
    if user["role"] != "pro":
        raise HTTPException(status_code=409, detail="You don't have an active Pro subscription.")
    async with database.transaction():
        await database.execute(
            "UPDATE users SET role = 'free' WHERE email = :email AND role = 'pro'",
            {"email": user["email"]},
        )
        await log_subscription_event(user["email"], user["organization_id"], "cancelled", user["email"])
    return {"status": "cancelled", "plan": "free", "message": "Your Pro subscription has been cancelled."}
