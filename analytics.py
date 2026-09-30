"""
analytics.py

Package 2 (Business Intelligence & Admin Analytics Backend) — aggregate
query functions behind the admin dashboard: counts by category,
lost/found by location, headline stats, and the recent activity feed.
Like scoring.py, no I/O and no FastAPI, so they work the same whether
the items come from fake_data.py or a real database. (Once the DB
exists, these can be replaced by GROUP BY / ORDER BY queries, but keep
these as the reference implementation and for tests.)

DEFINITIONS (put these in your report so the numbers are defensible):
    recovered           = number of LOST reports with status 'returned'
    recovery_rate       = recovered / total lost reports * 100
    avg_match_time_days = mean(returned_at - event_date) over recovered
                          lost reports. Returns None for now: the Item
                          model has no returned_at yet (see repository.py
                          note) — ask Kullatida to add it, then this
                          becomes a one-line change.
Found items are not counted in the rate; one recovery is one lost
report resolved, and counting the matching found report too would
double-count it.
"""

from typing import Optional

from models import Item, ItemType, ItemStatus
from schemas import ActivityEntry, CategoryCount, LocationCount, SummaryStats
from sorting import insertion_sort


def count_by_category(
    items: list[Item],
    item_type: Optional[ItemType] = None,
) -> list[CategoryCount]:
    """Number of items per category, biggest first (ties: alphabetical).
    Pass item_type to count only lost or only found. Counts every
    status; filter `items` beforehand if you only want open ones."""

    counts: dict[str, int] = {}
    for item in items:
        if item_type is not None and item.type != item_type:
            continue
        counts[item.category] = counts.get(item.category, 0) + 1

    rows = [CategoryCount(category=c, count=n) for c, n in counts.items()]
    return insertion_sort(rows, key=lambda r: (-r.count, r.category))


def count_by_location(items: list[Item]) -> list[LocationCount]:
    """Lost and found counts per location, busiest location first
    (ties: alphabetical). Shaped for a grouped bar chart."""

    tally: dict[str, dict[str, int]] = {}
    for item in items:
        row = tally.setdefault(item.location, {"lost": 0, "found": 0})
        row[item.type.value] += 1

    rows = [
        LocationCount(location=loc, lost=t["lost"], found=t["found"])
        for loc, t in tally.items()
    ]
    return insertion_sort(rows, key=lambda r: (-(r.lost + r.found), r.location))


def summary_stats(items: list[Item]) -> SummaryStats:
    """Headline numbers for the home / analytics dashboards."""

    lost = [i for i in items if i.type == ItemType.lost]
    found = [i for i in items if i.type == ItemType.found]

    recovered = sum(1 for i in lost if i.status == ItemStatus.returned)
    lost_open = sum(1 for i in lost if i.status == ItemStatus.open)
    found_open = sum(1 for i in found if i.status == ItemStatus.open)
    rate = round(recovered / len(lost) * 100, 1) if lost else 0.0

    return SummaryStats(
        total_lost=len(lost),
        total_found=len(found),
        lost_open=lost_open,
        found_open=found_open,
        recovered=recovered,
        recovery_rate=rate,
        avg_match_time_days=None,  # needs returned_at on the real schema
    )


def recent_activity(items: list[Item], limit: int = 10) -> list[ActivityEntry]:
    """Most recently reported items first, for the admin dashboard's
    activity feed. Uses event_date until a real created_at exists
    (same caveat as GET /items/recent)."""

    newest_first = insertion_sort(items, key=lambda i: i.event_date, reverse=True)
    return [
        ActivityEntry(
            id=i.id,
            # Item has no `name` field yet — falls back to category
            # (e.g. "bottle") until the real schema adds one.
            name=i.category,
            type=i.type.value,
            status=i.status.value,
            category=i.category,
            location=i.location,
            event_date=i.event_date,
        )
        for i in newest_first[:limit]
    ]
