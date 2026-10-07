import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import database
from deps import require_role
from routes.items import current_user

router = APIRouter(tags=["billing"])

# Simulated prices in THB per month. Only Enterprise is purchasable.
PLAN_PRICES = {"enterprise": 4800}


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


class CheckoutRequest(BaseModel):
    plan: Literal["enterprise"]


class WebhookRequest(BaseModel):
    reference: str


@router.get("/billing/status")
async def billing_status(user=Depends(current_user)):
    org = await database.fetch_one(
        "SELECT name, tier, seat_limit FROM organizations WHERE id = :id",
        {"id": user["organization_id"]},
    )
    return {
        "organization": org["name"],
        "tier": org["tier"],
        "seat_limit": org["seat_limit"],
        "role": user["role"],
    }


@router.post("/billing/checkout")
async def checkout(payload: CheckoutRequest, user=Depends(require_role("admin"))):
    org = await database.fetch_one(
        "SELECT tier FROM organizations WHERE id = :id",
        {"id": user["organization_id"]},
    )
    if org["tier"] == payload.plan:
        raise HTTPException(status_code=409, detail="Organization is already on this plan")

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
async def webhook(payload: WebhookRequest, user=Depends(require_role("admin"))):
    # Simulates the payment provider calling back after the QR is "scanned".
    txn = await database.fetch_one(
        "SELECT * FROM transactions WHERE reference = :ref AND organization_id = :org",
        {"ref": payload.reference, "org": user["organization_id"]},
    )
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn["status"] == "paid":
        return {"status": "paid", "message": "Already confirmed"}

    async with database.transaction():
        await database.execute(
            "UPDATE transactions SET status = 'paid', paid_at = NOW() WHERE id = :id",
            {"id": txn["id"]},
        )
        await database.execute(
            "UPDATE organizations SET tier = :tier WHERE id = :org",
            {"tier": txn["tier"], "org": txn["organization_id"]},
        )
        # Admins keep their role; everyone else in the organization becomes Pro.
        await database.execute(
            """
            UPDATE users SET role = 'pro'
            WHERE organization_id = :org AND role <> 'admin'
            """,
            {"org": txn["organization_id"]},
        )
    return {"status": "paid", "tier": txn["tier"], "message": "Upgrade complete"}