"""
routes/stats.py - live numbers for the home page.

GET /api/stats/public

Works without logging in, so the home page can show real numbers to everyone.
    - logged in   -> numbers for the user's own organization
    - logged out  -> numbers for the default campus (organization slug 'kmitl')

Only safe fields are returned: counts, and for the newest reports just the
name, location and date. No description, contact or reporter email.
"""

from datetime import datetime
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from database import database
from routes.auth import ALGORITHM, SECRET_KEY

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

DEFAULT_ORG_SLUG = "kmitl"
RECENT_LIMIT = 3


class RecentItem(BaseModel):
    name: str
    location: str
    date_reported: datetime


class PublicStats(BaseModel):
    organization: Optional[str]
    lost_open: int
    found_open: int
    recovered: int
    recent_found: List[RecentItem]
    recent_lost: List[RecentItem]


async def _org_of_caller(credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[int]:
    """The caller's organization id if they send a valid, current login token, else None.
    A missing or bad token is not an error here: the page is public."""
    if credentials is None:
        return None
    try:
        email = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except jwt.PyJWTError:
        return None
    if not email:
        return None
    row = await database.fetch_one(
        "SELECT organization_id FROM users "
        "WHERE email = :email AND token = :token AND is_active",
        {"email": email, "token": credentials.credentials},
    )
    return row["organization_id"] if row else None


async def _recent(org_id: int, item_type: str) -> List[RecentItem]:
    rows = await database.fetch_all(
        """
        SELECT name, location, date_reported FROM items
        WHERE organization_id = :org AND type = :type AND status = 'open'
        ORDER BY date_reported DESC
        LIMIT :limit
        """,
        {"org": org_id, "type": item_type, "limit": RECENT_LIMIT},
    )
    return [RecentItem(**dict(r)) for r in rows]


@router.get("/stats/public", response_model=PublicStats)
async def public_stats(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    org_id = await _org_of_caller(credentials)
    if org_id is None:
        row = await database.fetch_one(
            "SELECT id FROM organizations WHERE slug = :slug", {"slug": DEFAULT_ORG_SLUG}
        )
        if row is None:  # no campus set up yet
            return PublicStats(organization=None, lost_open=0, found_open=0, recovered=0,
                               recent_found=[], recent_lost=[])
        org_id = row["id"]

    counts = await database.fetch_one(
        """
        SELECT
            COUNT(*) FILTER (WHERE type = 'lost'  AND status = 'open') AS lost_open,
            COUNT(*) FILTER (WHERE type = 'found' AND status = 'open') AS found_open,
            COUNT(*) FILTER (WHERE status = 'claimed')                 AS recovered
        FROM items
        WHERE organization_id = :org
        """,
        {"org": org_id},
    )
    org = await database.fetch_one("SELECT name FROM organizations WHERE id = :id", {"id": org_id})

    return PublicStats(
        organization=org["name"] if org else None,
        lost_open=counts["lost_open"],
        found_open=counts["found_open"],
        recovered=counts["recovered"],
        recent_found=await _recent(org_id, "found"),
        recent_lost=await _recent(org_id, "lost"),
    )
