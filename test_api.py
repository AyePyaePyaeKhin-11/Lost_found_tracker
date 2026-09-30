"""
test_api.py

Run with:  pytest -v
(needs: pip install -r requirements-dev.txt)
"""

import random
from datetime import date

import pytest
from fastapi.testclient import TestClient

import repository
from main import app
from models import ItemStatus
from sorting import insertion_sort
import fake_data

client = TestClient(app)


@pytest.fixture
def with_returned(monkeypatch):
    """Dataset where L002 (wallet) and F003 (its match) are returned,
    so status filtering and recovery rate have something to show."""
    def patched():
        items = fake_data.get_all_items()
        for i in items:
            if i.id in ("L002", "F003"):
                i.status = ItemStatus.returned
        return items
    monkeypatch.setattr(repository, "get_all_items", patched)


# ------------------------------------------------------ generic sorting

def test_insertion_sort_matches_builtin_sorted():
    rng = random.Random(42)
    for _ in range(50):
        data = [rng.randint(0, 20) for _ in range(rng.randint(0, 25))]
        assert insertion_sort(data, key=lambda x: x) == sorted(data)
        assert insertion_sort(data, key=lambda x: x, reverse=True) == sorted(data, reverse=True)


def test_insertion_sort_is_stable_and_non_mutating():
    data = [("a", 2), ("b", 1), ("c", 2), ("d", 1)]
    original = list(data)
    asc = insertion_sort(data, key=lambda t: t[1])
    desc = insertion_sort(data, key=lambda t: t[1], reverse=True)
    assert asc == [("b", 1), ("d", 1), ("a", 2), ("c", 2)]   # ties keep input order
    assert desc == [("a", 2), ("c", 2), ("b", 1), ("d", 1)]
    assert data == original


# -------------------------------------------- matching (regression)

def test_match_scores_unchanged():
    r = client.get("/match/L001")
    assert r.status_code == 200
    body = r.json()
    assert [(m["found_id"], m["score"]) for m in body] == [("F001", 90), ("F002", 80)]


def test_match_404_cases():
    assert client.get("/match/NOPE").status_code == 404
    assert client.get("/match/F001").status_code == 404      # found item, not lost
    assert client.get("/match/L001?limit=0").status_code == 400


def test_match_404_for_returned_lost_item(with_returned):
    assert client.get("/match/L002").status_code == 404


def test_match_skips_returned_found_items(monkeypatch):
    """F001 is L001's best match (90). Once it is returned it must
    disappear from the results and F002 becomes #1."""
    def patched():
        items = fake_data.get_all_items()
        for i in items:
            if i.id == "F001":
                i.status = ItemStatus.returned
        return items
    monkeypatch.setattr(repository, "get_all_items", patched)

    ids = [m["found_id"] for m in client.get("/match/L001").json()]
    assert ids == ["F002"]


# ------------------------------------------------------------- /items

def test_items_default_is_open_only(with_returned):
    ids = {i["id"] for i in client.get("/items").json()}
    assert "L002" not in ids and "F003" not in ids
    assert "L001" in ids


def test_items_status_filter(with_returned):
    returned = {i["id"] for i in client.get("/items?status=returned").json()}
    assert returned == {"L002", "F003"}
    everything = client.get("/items?status=all").json()
    assert len(everything) == 9


def test_items_invalid_status_rejected():
    assert client.get("/items?status=banana").status_code == 422


def test_items_keyword_plus_filter():
    r = client.get("/items?q=black&item_type=found")
    assert {i["id"] for i in r.json()} == {"F001", "F002", "F004"}


def test_items_pagination_and_total_header():
    r = client.get("/items?limit=4&offset=0")
    assert len(r.json()) == 4
    assert r.headers["X-Total-Count"] == "9"
    r2 = client.get("/items?limit=4&offset=8")
    assert len(r2.json()) == 1
    assert r2.headers["X-Total-Count"] == "9"


def test_items_limit_bounds():
    assert client.get("/items?limit=0").status_code == 422
    assert client.get("/items?limit=1000").status_code == 422


# ------------------------------------------------- recent + single item

def test_recent_items_newest_first():
    r = client.get("/items/recent?limit=3")
    assert r.status_code == 200          # not swallowed by /items/{item_id}
    dates = [date.fromisoformat(i["event_date"]) for i in r.json()]
    assert dates == sorted(dates, reverse=True)
    assert [i["id"] for i in r.json()][0] == "F004"    # 2026-09-20


def test_recent_items_type_filter():
    r = client.get("/items/recent?item_type=lost&limit=2")
    assert [i["id"] for i in r.json()] == ["L004", "L003"]


def test_get_single_item():
    assert client.get("/items/L001").json()["category"] == "bottle"
    assert client.get("/items/NOPE").status_code == 404


# ----------------------------------------------------------- analytics

def test_items_by_category():
    r = client.get("/analytics/items-by-category")
    assert r.json() == [
        {"category": "bottle", "count": 3},
        {"category": "phone", "count": 2},
        {"category": "umbrella", "count": 2},
        {"category": "wallet", "count": 2},
    ]


def test_items_by_category_filtered_by_type():
    r = client.get("/analytics/items-by-category?item_type=lost")
    assert all(row["count"] == 1 for row in r.json())
    assert len(r.json()) == 4


def test_by_location():
    rows = {r["location"]: r for r in client.get("/analytics/by-location").json()}
    assert rows["library"] == {"location": "library", "lost": 1, "found": 2}
    assert rows["robotics_lab"] == {"location": "robotics_lab", "lost": 1, "found": 1}


def test_summary_no_recoveries():
    s = client.get("/analytics/summary").json()
    assert s == {
        "total_lost": 4, "total_found": 5,
        "lost_open": 4, "found_open": 5,
        "recovered": 0, "recovery_rate": 0.0,
        "avg_match_time_days": None,
    }


def test_summary_with_recovery(with_returned):
    s = client.get("/analytics/summary").json()
    assert s["recovered"] == 1
    assert s["lost_open"] == 3
    assert s["found_open"] == 4
    assert s["recovery_rate"] == 25.0      # 1 of 4 lost reports


# --------------------------------------------------- admin analytics

def test_admin_analytics_combines_all_sections():
    r = client.get("/api/admin/analytics")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"summary", "items_by_category", "by_location", "recent_activity"}
    assert body["summary"] == client.get("/analytics/summary").json()
    assert body["items_by_category"] == client.get("/analytics/items-by-category").json()
    assert body["by_location"] == client.get("/analytics/by-location").json()


def test_admin_analytics_recent_activity_newest_first_and_limit():
    r = client.get("/api/admin/analytics?recent_limit=3")
    feed = r.json()["recent_activity"]
    assert len(feed) == 3
    dates = [i["event_date"] for i in feed]
    assert dates == sorted(dates, reverse=True)
    assert feed[0]["id"] == "F004"   # 2026-09-20, latest in fake_data


# ---------------------------------------------------------------- CORS

def test_cors_allows_frontend_origin():
    r = client.get("/items", headers={"Origin": "http://localhost:3000"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_blocks_unknown_origin():
    r = client.get("/items", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers
