"""
routes/admin_users.py

Package 2 - Admin user & subscription management (Agga Paing)

Admin-only endpoints, always scoped to the admin's own organization:

    GET    /api/admin/users                      list accounts with plan, status and activity
    PATCH  /api/admin/users/{email}              grant/revoke Pro, deactivate/reactivate
    POST   /api/admin/users/deactivate-inactive  bulk-deactivate accounts inactive for N days
    DELETE /api/admin/users/{email}              permanently remove an account that has
                                                 no reports and no payments

Rules:
    - admins can't change their own account or other admin accounts here
    - deactivating logs the user out (token cleared) and blocks future logins
    - accounts with reports or payments can only be deactivated, not deleted,
      so item history and revenue figures stay intact
"""

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from database import database
from deps import require_role
from routes.billing import log_subscription_event

router = APIRouter(tags=["admin users"])

require_admin = require_role("admin")


class AdminUser(BaseModel):
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime]
    last_login_at: Optional[datetime]
    last_active_at: Optional[datetime]
    items_reported: int
    payments: int
    can_delete: bool


class UserUpdate(BaseModel):
    plan: Optional[Literal["free", "pro"]] = None
    is_active: Optional[bool] = None


class BulkDeactivate(BaseModel):
    days: int = Field(90, ge=7, le=730)
    dry_run: bool = False


USER_LIST_SQL = """
    SELECT u.email,
           u.role,
           u.is_active,
           u.create_at                                         AS created_at,
           u.last_login_at,
           GREATEST(u.last_login_at, MAX(i.date_reported), u.create_at) AS last_active_at,
           COUNT(DISTINCT i.item_id)                           AS items_reported,
           COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'paid') AS payments,
           COUNT(DISTINCT t.id)                                AS all_transactions
    FROM users u
    LEFT JOIN items i        ON i.reported_by = u.email
    LEFT JOIN transactions t ON t.user_email = u.email
    WHERE u.organization_id = :org
    {extra}
    GROUP BY u.email
"""


def _to_model(row) -> AdminUser:
    return AdminUser(
        email=row["email"],
        role=row["role"],
        is_active=row["is_active"],
        created_at=row["created_at"],
        last_login_at=row["last_login_at"],
        last_active_at=row["last_active_at"],
        items_reported=row["items_reported"],
        payments=row["payments"],
        can_delete=row["role"] != "admin" and row["items_reported"] == 0 and row["all_transactions"] == 0,
    )


async def _get_target(email: str, admin) -> AdminUser:
    row = await database.fetch_one(
        USER_LIST_SQL.format(extra="AND u.email = :email"),
        {"org": admin["organization_id"], "email": email.strip().lower()},
    )
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    target = _to_model(row)
    if target.email == admin["email"]:
        raise HTTPException(status_code=400, detail="You can't change your own account here.")
    if target.role == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts can't be changed here.")
    return target


@router.get("/admin/users", response_model=list[AdminUser])
async def list_users(
    status: Literal["all", "active", "deactivated"] = "all",
    search: Optional[str] = Query(None, max_length=100),
    admin=Depends(require_admin),
):
    extra, values = "", {"org": admin["organization_id"]}
    if status == "active":
        extra += " AND u.is_active"
    elif status == "deactivated":
        extra += " AND NOT u.is_active"
    if search:
        extra += " AND u.email ILIKE :search"
        values["search"] = f"%{search.strip()}%"
    rows = await database.fetch_all(
        USER_LIST_SQL.format(extra=extra) + " ORDER BY (u.role = 'admin') DESC, last_active_at DESC NULLS LAST",
        values,
    )
    return [_to_model(r) for r in rows]


@router.patch("/admin/users/{email}", response_model=AdminUser)
async def update_user(email: str, payload: UserUpdate, admin=Depends(require_admin)):
    if payload.plan is None and payload.is_active is None:
        raise HTTPException(status_code=422, detail="Nothing to change")
    target = await _get_target(email, admin)

    async with database.transaction():
        if payload.plan is not None and payload.plan != target.role:
            await database.execute(
                "UPDATE users SET role = :plan WHERE email = :email",
                {"plan": payload.plan, "email": target.email},
            )
            await log_subscription_event(
                target.email,
                admin["organization_id"],
                "granted" if payload.plan == "pro" else "revoked",
                admin["email"],
            )
        if payload.is_active is not None and payload.is_active != target.is_active:
            # Deactivating also clears the token, which logs the user out.
            await database.execute(
                "UPDATE users SET is_active = :active, "
                "token = CASE WHEN :active THEN token ELSE NULL END "
                "WHERE email = :email",
                {"active": payload.is_active, "email": target.email},
            )

    row = await database.fetch_one(
        USER_LIST_SQL.format(extra="AND u.email = :email"),
        {"org": admin["organization_id"], "email": target.email},
    )
    return _to_model(row)


@router.post("/admin/users/deactivate-inactive")
async def deactivate_inactive(payload: BulkDeactivate, admin=Depends(require_admin)):
    """Deactivate non-admin accounts with no login and no reports in the last
    `days` days. Use dry_run=true to preview who would be affected."""
    rows = await database.fetch_all(
        USER_LIST_SQL.format(extra="AND u.is_active AND u.role <> 'admin'")
        + " HAVING GREATEST(u.last_login_at, MAX(i.date_reported), u.create_at)"
        "        < NOW() - make_interval(days => :days)"
        + " ORDER BY last_active_at",
        {"org": admin["organization_id"], "days": payload.days},
    )
    emails = [r["email"] for r in rows]
    if emails and not payload.dry_run:
        await database.execute(
            "UPDATE users SET is_active = FALSE, token = NULL "
            "WHERE organization_id = :org AND email = ANY(:emails)",
            {"org": admin["organization_id"], "emails": emails},
        )
    return {"days": payload.days, "dry_run": payload.dry_run, "count": len(emails), "emails": emails}


@router.delete("/admin/users/{email}")
async def delete_user(email: str, admin=Depends(require_admin)):
    target = await _get_target(email, admin)
    if not target.can_delete:
        raise HTTPException(
            status_code=409,
            detail="This account has reports or payments, so it can't be deleted. Deactivate it instead.",
        )
    await database.execute("DELETE FROM users WHERE email = :email", {"email": target.email})
    return {"deleted": target.email}
