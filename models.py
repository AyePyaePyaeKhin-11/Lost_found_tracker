"""
models.py

Fake/mock schema — a stand-in for the REAL database schema that
Package 1 (Backend Core & Database Architecture) will eventually own.

Why this exists:
    You (Package 2) don't need to wait for their PostgreSQL/ORM models
    to start building your scoring, sorting, search and grouping logic.
    Build against THIS shape now. When the real schema arrives, you
    only need to update these field names/types (or delete this file
    and import their real models) — your algorithm logic underneath
    does not need to change.

Once Package 1 delivers real ORM models (SQLAlchemy), you will likely
replace this file's classes with imports from their models module,
but keep this file around as a reference / for local testing.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum


class ItemStatus(str, Enum):
    open = "open"
    returned = "returned"


class ItemType(str, Enum):
    lost = "lost"
    found = "found"


class Item(BaseModel):
    """A single lost or found report. Mirrors the schema fields
    described in your course handbook (category, colour, brand,
    location, event_date, description, status)."""

    id: str
    type: ItemType
    category: str
    colour: str
    brand: Optional[str] = ""
    location: str
    event_date: date
    description: Optional[str] = ""
    status: ItemStatus = ItemStatus.open
    matched_item_id: Optional[str] = None


class MatchResult(BaseModel):
    """Output shape for one scored candidate match."""

    found_id: str
    score: int
    date_gap: int
    reasons: list[str]
