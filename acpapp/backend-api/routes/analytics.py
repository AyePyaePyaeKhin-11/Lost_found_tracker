"""
routes/analytics.py

Package 2 - Business Intelligence & Admin Analytics Backend (Agga Paing)

Admin-only dashboard metrics, computed with PostgreSQL aggregate
queries on the shared `items` and `users` tables. Every query is scoped
to the admin's own organization_id, matching how routes/items.py works.

Endpoint:
    GET /api/admin/analytics          everything the admin dashboard needs

Metric definitions (keep these in the design document, section 7):
    Archived items are deleted reports, so they are excluded everywhere.
    recovered            items with status 'claimed'
    recovery_rate        claimed / (open + claimed) * 100
    avg_match_time_days  average of (updated_at - date_reported) over
                         claimed items. This works because the claim
                         route sets updated_at = NOW() and claimed items
                         can no longer be edited, so updated_at is the
                         claim time.
    active_users_30d     distinct users who reported an item in the last
                         30 days (the users table has no last-login column)
    billing              MRR, ARR, paid transactions; None until the
                         transactions table from the billing work exists
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from database import database
from deps import require_role

logger = logging.getLogger(__name__)

router = APIRouter()

# Built once so tests can swap it with app.dependency_overrides[require_admin].
require_admin = require_role("admin")


# ---------------------------------------------------------- response shapes

class SummaryStats(BaseModel):
    total_items: int
    total_lost: int
    total_found: int
    open_lost: int
    open_found: int
    recovered: int
    recovered_lost: int
    recovered_found: int
    recovery_rate: float                  # percentage, 0-100
    avg_match_time_days: Optional[float]  # None when nothing is claimed yet


class CategoryCount(BaseModel):
    category: str
    count: int


class LocationCount(BaseModel):
    location: str
    lost: int
    found: int


class DailyCount(BaseModel):
    day: str        # ISO date, e.g. "2026-10-05"
    lost: int
    found: int


class ActivityEntry(BaseModel):
    item_id: str
    name: str
    type: str
    status: str
    category: str
    location: str
    date_reported: str


class UserStats(BaseModel):
    total_users: int
    active_users_30d: int
    users_by_role: Optional[dict[str, int]]  # None if users has no role column


class BillingStats(BaseModel):
    mrr: float
    arr: float
    paid_transactions: int
    transaction_volume: float


class AdminAnalytics(BaseModel):
    summary: SummaryStats
    items_by_category: list[CategoryCount]
    by_location: list[LocationCount]
    items_over_time: list[DailyCount]
    recent_activity: list[ActivityEntry]
    users: UserStats
    billing: Optional[BillingStats]


# ------------------------------------------------------- aggregate queries

async def summary_stats(org_id: int) -> SummaryStats:
    row = await database.fetch_one(
        """
        SELECT
            COUNT(*)                                                        AS total_items,
            COUNT(*) FILTER (WHERE type = 'lost')                           AS total_lost,
            COUNT(*) FILTER (WHERE type = 'found')                          AS total_found,
            COUNT(*) FILTER (WHERE type = 'lost'  AND status = 'open')      AS open_lost,
            COUNT(*) FILTER (WHERE type = 'found' AND status = 'open')      AS open_found,
            COUNT(*) FILTER (WHERE status = 'claimed')                      AS recovered,
            COUNT(*) FILTER (WHERE type = 'lost'  AND status = 'claimed')   AS recovered_lost,
            COUNT(*) FILTER (WHERE type = 'found' AND status = 'claimed')   AS recovered_found,
            AVG(EXTRACT(EPOCH FROM (updated_at - date_reported)) / 86400.0)
                FILTER (WHERE status = 'claimed')                           AS avg_match_days
        FROM items
        WHERE organization_id = :org_id
          AND status <> 'archived'
        """,
        {"org_id": org_id},
    )
    total = row["total_items"]
    recovered = row["recovered"]
    avg_days = row["avg_match_days"]
    return SummaryStats(
        total_items=total,
        total_lost=row["total_lost"],
        total_found=row["total_found"],
        open_lost=row["open_lost"],
        open_found=row["open_found"],
        recovered=recovered,
        recovered_lost=row["recovered_lost"],
        recovered_found=row["recovered_found"],
        recovery_rate=round(recovered / total * 100, 1) if total else 0.0,
        avg_match_time_days=round(float(avg_days), 1) if avg_days is not None else None,
    )


async def items_by_category(org_id: int) -> list[CategoryCount]:
    rows = await database.fetch_all(
        """
        SELECT category, COUNT(*) AS count
        FROM items
        WHERE organization_id = :org_id AND status <> 'archived'
        GROUP BY category
        ORDER BY count DESC, category ASC
        """,
        {"org_id": org_id},
    )
    return [CategoryCount(category=r["category"], count=r["count"]) for r in rows]


async def by_location(org_id: int) -> list[LocationCount]:
    rows = await database.fetch_all(
        """
        SELECT location,
               COUNT(*) FILTER (WHERE type = 'lost')  AS lost,
               COUNT(*) FILTER (WHERE type = 'found') AS found
        FROM items
        WHERE organization_id = :org_id AND status <> 'archived'
        GROUP BY location
        ORDER BY COUNT(*) DESC, location ASC
        """,
        {"org_id": org_id},
    )
    return [LocationCount(location=r["location"], lost=r["lost"], found=r["found"]) for r in rows]


async def items_over_time(org_id: int, days: int) -> list[DailyCount]:
    """One row per day for the last `days` days, including days with
    zero reports, so the line chart has no gaps."""
    rows = await database.fetch_all(
        """
        SELECT d.day::date AS day,
               COUNT(i.item_id) FILTER (WHERE i.type = 'lost')  AS lost,
               COUNT(i.item_id) FILTER (WHERE i.type = 'found') AS found
        FROM generate_series(
                 CURRENT_DATE - (:days - 1) * INTERVAL '1 day',
                 CURRENT_DATE,
                 INTERVAL '1 day'
             ) AS d(day)
        LEFT JOIN items i
               ON i.date_reported::date = d.day::date
              AND i.organization_id = :org_id
              AND i.status <> 'archived'
        GROUP BY d.day
        ORDER BY d.day
        """,
        {"org_id": org_id, "days": days},
    )
    return [DailyCount(day=r["day"].isoformat(), lost=r["lost"], found=r["found"]) for r in rows]


async def recent_activity(org_id: int, limit: int) -> list[ActivityEntry]:
    rows = await database.fetch_all(
        """
        SELECT item_id, name, type, status, category, location, date_reported
        FROM items
        WHERE organization_id = :org_id AND status <> 'archived'
        ORDER BY date_reported DESC
        LIMIT :limit
        """,
        {"org_id": org_id, "limit": limit},
    )
    return [
        ActivityEntry(
            item_id=str(r["item_id"]),
            name=r["name"],
            type=r["type"],
            status=r["status"],
            category=r["category"],
            location=r["location"],
            date_reported=r["date_reported"].isoformat(),
        )
        for r in rows
    ]


async def _users_has_role_column() -> bool:
    row = await database.fetch_one(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'role'
        ) AS has_role
        """
    )
    return bool(row["has_role"])


async def user_stats(org_id: int) -> UserStats:
    row = await database.fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM users WHERE organization_id = :org_id) AS total_users,
            (SELECT COUNT(DISTINCT reported_by) FROM items
              WHERE organization_id = :org_id
                AND date_reported >= NOW() - INTERVAL '30 days')           AS active_users
        """,
        {"org_id": org_id},
    )

    by_role: Optional[dict[str, int]] = None
    if await _users_has_role_column():
        rows = await database.fetch_all(
            """
            SELECT role, COUNT(*) AS count FROM users
            WHERE organization_id = :org_id
            GROUP BY role ORDER BY role
            """,
            {"org_id": org_id},
        )
        by_role = {str(r["role"]): r["count"] for r in rows}

    return UserStats(
        total_users=row["total_users"],
        active_users_30d=row["active_users"],
        users_by_role=by_role,
    )


async def billing_stats(org_id: int) -> Optional[BillingStats]:
    """MRR / ARR / transaction volume from the billing transactions table.

    ASSUMED CONTRACT - agree it with Aye before she creates the table:
        transactions(
            id, user_email -> users(email), organization_id -> organizations(id),
            plan VARCHAR, amount NUMERIC (THB), status VARCHAR ('pending'|'paid'|'failed'),
            created_at TIMESTAMPTZ
        )
    MRR = sum of paid amounts in the last 30 days (monthly subscriptions).
    Returns None if the table doesn't exist yet, so the endpoint keeps
    working before billing is merged.
    """
    exists = await database.fetch_one("SELECT to_regclass('public.transactions') IS NOT NULL AS ok")
    if not exists["ok"]:
        return None
    try:
        row = await database.fetch_one(
            """
            SELECT
                COALESCE(SUM(amount) FILTER (
                    WHERE created_at >= NOW() - INTERVAL '30 days'), 0) AS mrr,
                COUNT(*)                                                AS paid_count,
                COALESCE(SUM(amount), 0)                                AS volume
            FROM transactions
            WHERE organization_id = :org_id AND status = 'paid'
            """,
            {"org_id": org_id},
        )
    except Exception:
        # Column names differ from the contract above. Don't take the whole
        # dashboard down; log it and fix the query to match the real table.
        logger.exception("billing_stats: transactions table doesn't match expected columns")
        return None

    mrr = float(row["mrr"])
    return BillingStats(
        mrr=round(mrr, 2),
        arr=round(mrr * 12, 2),
        paid_transactions=row["paid_count"],
        transaction_volume=round(float(row["volume"]), 2),
    )


# --------------------------------------------------------------- endpoint

@router.get("/admin/analytics", response_model=AdminAnalytics)
async def admin_analytics(
    days: int = Query(30, ge=7, le=365, description="Window for the items-over-time chart"),
    recent_limit: int = Query(10, ge=1, le=50),
    user=Depends(require_admin),
):
    """Summarized dashboard statistics for the admin's organization."""
    org_id = user["organization_id"]
    return AdminAnalytics(
        summary=await summary_stats(org_id),
        items_by_category=await items_by_category(org_id),
        by_location=await by_location(org_id),
        items_over_time=await items_over_time(org_id, days),
        recent_activity=await recent_activity(org_id, recent_limit),
        users=await user_stats(org_id),
        billing=await billing_stats(org_id),
    )
