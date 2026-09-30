"""
scoring.py

The candidate scoring algorithm: given a lost item and a found item,
decide whether they're even comparable (is_candidate), and if so,
compute a similarity score out of 100 with human-readable reasons
(score_match).

This is pure logic — no database, no FastAPI, no I/O. That's
intentional: pure functions are the easiest thing to build and test
alone, and the easiest to plug into a real database later.
"""

from datetime import date
from models import Item, ItemType, ItemStatus, MatchResult

# Symmetric "nearby" location map. Add both directions.
NEARBY_LOCATIONS: dict[str, list[str]] = {
    "robotics_lab": ["engineering_lobby"],
    "engineering_lobby": ["robotics_lab"],
    "library": ["cafeteria"],
    "cafeteria": ["library"],
}


def is_candidate(lost: Item, found: Item) -> bool:
    """True only if:
    - lost is an open 'lost' item
    - found is an open 'found' item
    - categories match
    - found date is on/after lost date
    Does not mutate either input.
    """
    if lost.type != ItemType.lost or lost.status != ItemStatus.open:
        return False
    if found.type != ItemType.found or found.status != ItemStatus.open:
        return False
    if lost.category != found.category:
        return False
    if found.event_date < lost.event_date:
        return False
    return True


def _date_gap_days(lost: Item, found: Item) -> int:
    """Integer number of days between the two event dates."""
    return (found.event_date - lost.event_date).days


def _location_points(lost: Item, found: Item) -> tuple[int, str | None]:
    """Same location = 20, nearby = 10, neither = 0.
    Mutually exclusive — only one branch ever fires."""
    if lost.location == found.location:
        return 20, f"Same location ({lost.location}) (+20)"
    if found.location in NEARBY_LOCATIONS.get(lost.location, []):
        return 10, f"Nearby location ({lost.location} ~ {found.location}) (+10)"
    return 0, None


def _date_points(gap_days: int) -> tuple[int, str | None]:
    """0 days = 15, 1-2 days = 10, 3-7 days = 5, more than 7 = 0.
    Mutually exclusive branches."""
    if gap_days == 0:
        return 15, "Same date (+15)"
    if 1 <= gap_days <= 2:
        return 10, f"Found {gap_days} day(s) later (+10)"
    if 3 <= gap_days <= 7:
        return 5, f"Found {gap_days} day(s) later (+5)"
    return 0, None


def score_match(lost: Item, found: Item) -> MatchResult:
    """Return a MatchResult for an eligible pair. Raises ValueError
    if the pair is not eligible. Does not mutate either input."""

    if not is_candidate(lost, found):
        raise ValueError(
            f"Not an eligible pair: lost={lost.id} found={found.id}"
        )

    score = 0
    reasons: list[str] = []

    # Category is already required by is_candidate, so it always awards.
    score += 30
    reasons.append(f"Same category ({lost.category}) (+30)")

    if lost.colour == found.colour:
        score += 20
        reasons.append(f"Same colour ({lost.colour}) (+20)")

    if lost.brand and found.brand and lost.brand == found.brand:
        score += 15
        reasons.append(f"Same brand ({lost.brand}) (+15)")

    loc_points, loc_reason = _location_points(lost, found)
    score += loc_points
    if loc_reason:
        reasons.append(loc_reason)

    gap_days = _date_gap_days(lost, found)
    date_points, date_reason = _date_points(gap_days)
    score += date_points
    if date_reason:
        reasons.append(date_reason)

    return MatchResult(
        found_id=found.id,
        score=score,
        date_gap=gap_days,
        reasons=reasons,
    )
