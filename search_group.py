"""
search_group.py

Search / filter / grouping helpers for browsing found items —
independent of the scoring/matching flow above. These map to the
"multi-parameter search, campus location filtering, and category
grouping" deliverable in Package 2.
"""

from collections import defaultdict
from models import Item, ItemType, ItemStatus


def filter_items(
    items: list[Item],
    category: str | None = None,
    location: str | None = None,
    item_type: ItemType | None = None,
    status: ItemStatus = ItemStatus.open,
) -> list[Item]:
    """Return items matching all given filters. None means 'don't
    filter on this field'. Status defaults to open only."""

    result = items
    if status is not None:
        result = [i for i in result if i.status == status]
    if category is not None:
        result = [i for i in result if i.category == category]
    if location is not None:
        result = [i for i in result if i.location == location]
    if item_type is not None:
        result = [i for i in result if i.type == item_type]
    return result


def group_by_category(items: list[Item]) -> dict[str, list[Item]]:
    """Group items into a dict keyed by category."""
    groups: dict[str, list[Item]] = defaultdict(list)
    for item in items:
        groups[item.category].append(item)
    return dict(groups)


def group_by_location(items: list[Item]) -> dict[str, list[Item]]:
    """Group items into a dict keyed by location."""
    groups: dict[str, list[Item]] = defaultdict(list)
    for item in items:
        groups[item.location].append(item)
    return dict(groups)


def search_by_keyword(items: list[Item], keyword: str) -> list[Item]:
    """Simple case-insensitive substring search across category,
    colour, brand and description."""
    kw = keyword.lower()
    return [
        i for i in items
        if kw in i.category.lower()
        or kw in i.colour.lower()
        or kw in (i.brand or "").lower()
        or kw in (i.description or "").lower()
    ]
