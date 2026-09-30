"""
main.py

FastAPI app tying together scoring, sorting, search, grouping and
analytics into live HTTP endpoints. All data reads go through
repository.py, so swapping fake_data.py for the real database means
editing repository.py only.

Run locally:
    uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs for interactive API testing.

Environment variables:
    CORS_ORIGINS   comma-separated list of allowed frontend origins.
                   Default: http://localhost:3000
                   Example: http://localhost:3000,https://your-app.vercel.app
"""

import os
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

import repository
from models import Item, MatchResult, ItemType, ItemStatus
from schemas import AdminAnalytics, CategoryCount, LocationCount, SummaryStats
from scoring import is_candidate, score_match
from sorting import insertion_sort, insertion_sort_matches
from search_group import filter_items, group_by_category, group_by_location, search_by_keyword
from analytics import count_by_category, count_by_location, recent_activity, summary_stats

app = FastAPI(title="Lost & Found Matching Engine (Package 2)")

# The Next.js frontend runs on a different origin, so the browser blocks
# its requests unless we explicitly allow it here.
_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],  # lets the frontend read the pagination total
)

# "all" isn't a real ItemStatus; it's the API's way of saying "don't filter".
StatusFilter = Literal["open", "returned", "all"]


def _status_arg(status: StatusFilter) -> Optional[ItemStatus]:
    """Convert the query-string value to what filter_items() expects
    (None = no status filter)."""
    return None if status == "all" else ItemStatus(status)


@app.get("/")
def root():
    return {"status": "ok", "message": "Matching engine is running"}


# ---------------------------------------------------------------- items

@app.get("/items", response_model=list[Item])
def list_items(
    response: Response,
    category: Optional[str] = None,
    location: Optional[str] = None,
    item_type: Optional[ItemType] = None,
    status: StatusFilter = "open",
    q: Optional[str] = Query(None, min_length=1, description="Keyword search"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List items with optional filters, keyword search and pagination.

    status: open (default) | returned | all
    q:      case-insensitive keyword across category/colour/brand/description
    The total number of matches (before limit/offset) is returned in the
    X-Total-Count response header.
    """
    items = filter_items(
        repository.get_all_items(),
        category=category,
        location=location,
        item_type=item_type,
        status=_status_arg(status),
    )
    if q:
        items = search_by_keyword(items, q)

    response.headers["X-Total-Count"] = str(len(items))
    return items[offset: offset + limit]


# NOTE: /items/recent must be declared BEFORE /items/{item_id}, otherwise
# FastAPI would treat the word "recent" as an item id.
@app.get("/items/recent", response_model=list[Item])
def recent_items(
    limit: int = Query(5, ge=1, le=50),
    item_type: Optional[ItemType] = None,
    status: StatusFilter = "open",
):
    """Most recent items first, for the homepage lists.

    'Recent' currently means latest event_date, because items have no
    created_at yet. Ask Package 1 to add one; then sort on that instead."""
    items = filter_items(
        repository.get_all_items(),
        item_type=item_type,
        status=_status_arg(status),
    )
    newest_first = insertion_sort(items, key=lambda i: i.event_date, reverse=True)
    return newest_first[:limit]


@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: str):
    """One item by id (for the item detail screen)."""
    item = repository.get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"No item with id {item_id}")
    return item


# --------------------------------------------------------------- search

@app.get("/search", response_model=list[Item])
def search_items(keyword: str = Query(..., min_length=1)):
    """Keyword search across category, colour, brand, description."""
    return search_by_keyword(repository.get_all_items(), keyword)


# ------------------------------------------------------------- grouping

@app.get("/groups/by-category")
def groups_by_category():
    """Items grouped by category."""
    return group_by_category(repository.get_all_items())


@app.get("/groups/by-location")
def groups_by_location():
    """Items grouped by location."""
    return group_by_location(repository.get_all_items())


# -------------------------------------- admin analytics (Package 2)
#
# Business Intelligence & Admin Analytics Backend deliverables:
#   - data model            -> schemas.py (SummaryStats, CategoryCount,
#                               LocationCount, ActivityEntry, AdminAnalytics)
#   - aggregate query funcs  -> analytics.py (count_by_category,
#                               count_by_location, summary_stats,
#                               recent_activity)
#   - dashboard endpoint     -> GET /api/admin/analytics (below)
#
# The three /analytics/* routes stay so the frontend dashboard mockup
# (which fetches each card separately) keeps working unchanged.

@app.get("/analytics/summary", response_model=SummaryStats)
def analytics_summary():
    """Headline numbers: open lost/found, recovered, recovery rate."""
    return summary_stats(repository.get_all_items())


@app.get("/analytics/items-by-category", response_model=list[CategoryCount])
def analytics_items_by_category(item_type: Optional[ItemType] = None):
    """Item counts per category, biggest first (for the bar chart)."""
    return count_by_category(repository.get_all_items(), item_type=item_type)


@app.get("/analytics/by-location", response_model=list[LocationCount])
def analytics_by_location():
    """Lost and found counts per location, busiest first."""
    return count_by_location(repository.get_all_items())


@app.get("/api/admin/analytics", response_model=AdminAnalytics)
def admin_analytics(recent_limit: int = Query(10, ge=1, le=50)):
    """Single-call summarized dashboard payload: headline stats,
    items-by-category, lost/found-by-location and the recent activity
    feed — the endpoint named in the Package 2 task table."""
    items = repository.get_all_items()
    return AdminAnalytics(
        summary=summary_stats(items),
        items_by_category=count_by_category(items),
        by_location=count_by_location(items),
        recent_activity=recent_activity(items, limit=recent_limit),
    )


# ------------------------------------------------------------- matching

@app.get("/match/{lost_id}", response_model=list[MatchResult])
def find_matches(lost_id: str, limit: int = 3):
    """Find and rank the top `limit` found-item matches for a given
    lost item ID. This is the main scoring + sorting pipeline."""

    if limit <= 0:
        raise HTTPException(status_code=400, detail="limit must be a positive integer")

    lost_item = repository.get_item(lost_id)
    if (
        lost_item is None
        or lost_item.type != ItemType.lost
        or lost_item.status != ItemStatus.open
    ):
        raise HTTPException(status_code=404, detail=f"No open lost item with id {lost_id}")

    candidates = repository.get_open_items_by_type(ItemType.found)
    matches: list[MatchResult] = []

    for found_item in candidates:
        if is_candidate(lost_item, found_item):
            matches.append(score_match(lost_item, found_item))

    ranked = insertion_sort_matches(matches)
    return ranked[:limit]
