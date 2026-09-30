# Lost and Found Tracker — Package 2: Business Intelligence & Admin Analytics Backend

Backend service for the admin analytics dashboard: aggregate metrics
(recovery rate, items by category, lost/found by location, recent
activity) served over a FastAPI API. Built to run against a mock
in-memory dataset now, and swap to the team's real database with a
one-file change once it's ready.

> Matching engine, scoring and insertion-sort ranking are owned by
> Preeyapat under this package split. This service focuses on
> **read-side aggregation** for the admin dashboard.

## Tech stack

- **Framework:** FastAPI (Python)
- **Validation / schemas:** Pydantic
- **Server:** Uvicorn
- **Testing:** pytest + FastAPI's `TestClient`
- **Data source (current):** in-memory mock dataset (`fake_data.py`)
- **Data source (planned):** PostgreSQL via Supabase/Neon, once Package 1 delivers the schema

## Project structure

```
.
├── main.py            # FastAPI app: routes only, no business logic
├── repository.py       # Single data-access layer — the one file to
│                        # change when swapping mock data for the real DB
├── models.py           # Item / MatchResult schema (mock, pending real DB schema)
├── schemas.py           # Admin analytics response shapes (SummaryStats,
│                        # CategoryCount, LocationCount, ActivityEntry, AdminAnalytics)
├── analytics.py         # Aggregate query functions behind the dashboard
├── search_group.py      # Keyword search, filtering, grouping helpers
├── sorting.py           # Hand-written insertion sort (generic + match-ranking)
├── scoring.py           # Candidate eligibility + match scoring (matching engine)
├── fake_data.py         # Mock lost/found dataset for local development
├── test_api.py          # pytest suite covering all endpoints
├── requirements.txt      # Runtime dependencies
└── requirements-dev.txt  # Runtime + test dependencies
```

## Setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
```

## Running locally

```bash
uvicorn main:app --reload
```

Interactive docs (Swagger UI): http://127.0.0.1:8000/docs

### CORS

The Next.js frontend runs on a different origin, so CORS is enabled
via an environment variable:

```bash
export CORS_ORIGINS="http://localhost:3000,https://your-app.vercel.app"
```

Defaults to `http://localhost:3000` if unset.

## Running tests

```bash
pytest -v
```

24 tests, covering the sorting algorithm against Python's built-in
`sorted()`, matching-engine regression (hand-calculated 90/100 example),
status filtering, pagination, recent items, admin analytics, and CORS.

## API reference

### Admin analytics (this package's main deliverable)

| Endpoint | Description |
|---|---|
| `GET /api/admin/analytics` | Combined dashboard payload: summary + items-by-category + by-location + recent activity, in one call |
| `GET /analytics/summary` | Headline stats: open lost/found, recovered, recovery rate |
| `GET /analytics/items-by-category` | Item counts per category, biggest first (optional `item_type` filter) |
| `GET /analytics/by-location` | Lost/found counts per location, busiest first |

**Recovery rate** is defined as `recovered lost reports / total lost reports × 100`.
Found items aren't counted separately, since each recovery already
closes one lost report.

`avg_match_time_days` is currently always `null` — the `Item` model
has no `returned_at` field yet. It'll be computable once the real
schema adds one.

### Items

| Endpoint | Description |
|---|---|
| `GET /items` | List items. Filters: `category`, `location`, `item_type`, `status` (default `open`), `q` (keyword). Paginated via `limit`/`offset`; total count in `X-Total-Count` header |
| `GET /items/{item_id}` | Single item by id |
| `GET /items/recent` | Most recent items first (by `event_date`; `created_at` pending) |
| `GET /search` | Keyword search across category, colour, brand, description |
| `GET /groups/by-category` | Items grouped by category |
| `GET /groups/by-location` | Items grouped by location |

### Matching (owned by Preeyapat under the current split; kept here for now)

| Endpoint | Description |
|---|---|
| `GET /match/{lost_id}?limit=N` | Top-N ranked found-item matches for a lost item |

## Data model notes

`models.py` is a placeholder for Package 1's real database schema.
Known gaps to resolve before the DB swap:

- No `name` field — the admin activity feed currently falls back to `category`
- No `created_at` / `returned_at` — blocks "recent" meaning report time (vs. event date) and average match time
- `location` is free text — needs a fixed list of campus locations for the map, filters, and the "nearby" scoring rule

## Swapping in the real database

All reads go through `repository.py`:

```python
get_all_items()
get_item(item_id)
get_open_items_by_type(item_type)
```

Rewrite the bodies of these three functions against the real database
or ORM; `main.py`, `analytics.py`, and everything else stay unchanged.
