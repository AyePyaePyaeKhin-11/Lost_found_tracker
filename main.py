"""
main.py

FastAPI app tying together scoring, sorting, search and grouping into
live HTTP endpoints. Right now it reads from fake_data.py. When
Package 1's real database is ready, replace get_all_items() calls
with real DB queries — the route logic below barely needs to change.

Run locally:
    uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs for interactive API testing
(Swagger UI) — no Postman needed, though Postman/Insomnia work too.
"""

from fastapi import FastAPI, HTTPException, Query
from typing import Optional

from models import Item, MatchResult, ItemType, ItemStatus
from fake_data import get_all_items
from scoring import is_candidate, score_match
from sorting import insertion_sort_matches
from search_group import filter_items, group_by_category, group_by_location, search_by_keyword

app = FastAPI(title="Lost & Found Matching Engine (Package 2)")


@app.get("/")
def root():
    return {"status": "ok", "message": "Matching engine is running"}


@app.get("/items", response_model=list[Item])
def list_items(
    category: Optional[str] = None,
    location: Optional[str] = None,
    item_type: Optional[ItemType] = None,
):
    """List items with optional filters."""
    items = get_all_items()
    return filter_items(items, category=category, location=location, item_type=item_type)


@app.get("/search", response_model=list[Item])
def search_items(keyword: str = Query(..., min_length=1)):
    """Keyword search across category, colour, brand, description."""
    items = get_all_items()
    return search_by_keyword(items, keyword)


@app.get("/groups/by-category")
def groups_by_category():
    """Items grouped by category."""
    items = get_all_items()
    return group_by_category(items)


@app.get("/groups/by-location")
def groups_by_location():
    """Items grouped by location."""
    items = get_all_items()
    return group_by_location(items)


@app.get("/match/{lost_id}", response_model=list[MatchResult])
def find_matches(lost_id: str, limit: int = 3):
    """Find and rank the top `limit` found-item matches for a given
    lost item ID. This is the main scoring + sorting pipeline."""

    if limit <= 0:
        raise HTTPException(status_code=400, detail="limit must be a positive integer")

    items = get_all_items()
    lost_item = next((i for i in items if i.id == lost_id and i.type == ItemType.lost), None)
    if lost_item is None:
        raise HTTPException(status_code=404, detail=f"No open lost item with id {lost_id}")

    candidates = [i for i in items if i.type == ItemType.found]
    matches: list[MatchResult] = []

    for found_item in candidates:
        if is_candidate(lost_item, found_item):
            matches.append(score_match(lost_item, found_item))

    ranked = insertion_sort_matches(matches)
    return ranked[:limit]
