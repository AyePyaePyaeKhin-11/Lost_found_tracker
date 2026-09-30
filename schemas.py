"""
schemas.py

Admin analytics data model — Package 2 (Business Intelligence & Admin
Analytics Backend). Kept separate from models.py on purpose: models.py
describes stored items and may be replaced by Package 1's real ORM
models; these describe what the admin dashboard receives and stay yours.
"""

from datetime import date
from pydantic import BaseModel


class CategoryCount(BaseModel):
    category: str
    count: int


class LocationCount(BaseModel):
    location: str
    lost: int
    found: int


class SummaryStats(BaseModel):
    total_lost: int          # every lost report ever filed (open + returned)
    total_found: int         # every found report ever filed
    lost_open: int           # lost reports still unresolved
    found_open: int          # found reports still unclaimed
    recovered: int           # lost reports that have been returned to the owner
    recovery_rate: float     # recovered / total_lost, as a percentage (0-100)
    avg_match_time_days: float | None = None  # None until created_at/returned_at exist


class ActivityEntry(BaseModel):
    """One row in the 'recent activity' feed."""
    id: str
    name: str
    type: str            # "lost" | "found"
    status: str           # "open" | "returned"
    category: str
    location: str
    event_date: date


class AdminAnalytics(BaseModel):
    """Combined payload for GET /api/admin/analytics — everything the
    admin dashboard needs in one call."""
    summary: SummaryStats
    items_by_category: list[CategoryCount]
    by_location: list[LocationCount]
    recent_activity: list[ActivityEntry]
