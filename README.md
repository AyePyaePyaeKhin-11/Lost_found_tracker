# Matching Engine — Package 2 (Grouping & Sorting)

Standalone starter project. Everything here is built against a FAKE
dataset (`fake_data.py`) so you can develop and test alone, without
waiting on Package 1's real database.

## Files

| File | What it does | Status |
|---|---|---|
| `models.py` | Fake schema (Item, MatchResult) — stand-in for Package 1's real DB models | Replace later |
| `fake_data.py` | Hand-built sample lost/found items | Delete once real DB exists |
| `scoring.py` | `is_candidate`, `score_match` — eligibility + scoring algorithm | Yours to keep |
| `sorting.py` | `insertion_sort_matches` — hand-written insertion sort, your ranking rule | Yours to keep |
| `search_group.py` | Filtering, search-by-keyword, group-by-category/location | Yours to keep |
| `main.py` | FastAPI app wiring it all into HTTP endpoints | Update data source later |

The scoring/sorting/search/grouping logic in the "Yours to keep" files
is database-agnostic — it only depends on `models.py`'s Item shape,
not on where the data comes from. That's why you can build it now and
barely touch it later.

## Setup (local machine, not this sandbox)

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000/docs** — this gives you an
interactive UI to test every endpoint without needing Postman.

## Endpoints

- `GET /items` — list items, optional `?category=` `?location=` `?item_type=`
- `GET /search?keyword=black` — keyword search
- `GET /groups/by-category` — items grouped by category
- `GET /groups/by-location` — items grouped by location
- `GET /match/{lost_id}?limit=3` — scored + ranked matches for a lost item
  - Try `GET /match/L001` — should return F001 (score 90) ranked above F002 (score 80)

## Testing the core logic without a server

```bash
python3 -c "
from fake_data import get_all_items
from scoring import is_candidate, score_match
from sorting import insertion_sort_matches

items = get_all_items()
lost = next(i for i in items if i.id == 'L001')
found_items = [i for i in items if i.type.value == 'found']
matches = [score_match(lost, f) for f in found_items if is_candidate(lost, f)]
for m in insertion_sort_matches(matches):
    print(m)
"
```

## When Package 1's real database is ready

1. Replace `models.py`'s classes with imports from their SQLAlchemy/ORM models
   (or keep these as Pydantic response models, common in FastAPI + SQLAlchemy setups).
2. In `main.py`, replace `get_all_items()` calls with real DB queries
   (e.g. `db.query(Item).all()`).
3. Delete or archive `fake_data.py`.
4. `scoring.py`, `sorting.py`, `search_group.py` should need **zero changes** —
   that's the whole point of building against a fake schema first.

## What's still genuinely blocked on teammates

- **Analytics queries (MRR/ARR, retention, recovery-rate trends)** need the
  real database and real data — can't be meaningfully built against fake data.
  You can still research the SQL patterns and draft pseudocode now.
- **Postgres connection** — confirm with your team whether you're using
  Docker locally or a hosted Supabase/Neon instance, and get credentials
  once it's running.
