"""
sorting.py

Your core "Grouping & Sorting" deliverable: rank scored match results
using hand-written insertion sort (not Python's built-in sort/sorted,
since this is a DSA course and the algorithm itself is graded).

Comparison rule (in priority order):
    1. Higher score wins.
    2. If scores tie, smaller date_gap wins.
    3. If still tied, earlier found_id (alphabetical) wins.
The third rule is just a deterministic tie-break, not a real signal.
"""

from models import MatchResult


def _ranks_before(a: MatchResult, b: MatchResult) -> bool:
    """True if match `a` should be ranked strictly ahead of `b`."""
    if a.score != b.score:
        return a.score > b.score
    if a.date_gap != b.date_gap:
        return a.date_gap < b.date_gap
    return a.found_id < b.found_id


def insertion_sort_matches(matches: list[MatchResult]) -> list[MatchResult]:
    """Classic insertion sort, applied to MatchResult objects using
    the comparison rule above. Returns a NEW list; the input list is
    left unchanged."""

    result = matches.copy()  # never mutate the caller's list

    for i in range(1, len(result)):
        key = result[i]
        j = i - 1
        # Shift earlier items right while they should rank BEHIND key
        while j >= 0 and _ranks_before(key, result[j]):
            result[j + 1] = result[j]
            j -= 1
        result[j + 1] = key

    return result
