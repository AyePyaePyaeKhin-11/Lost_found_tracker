"""Run after docker compose up --build: python3 backend-api/tests/smoke_items.py"""

import json
import urllib.error
import urllib.request
from uuid import uuid4

BASE = "http://localhost:8000/api"


def request(method, path, payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = raw or "No response body; inspect docker compose logs backend-api"
        return error.code, body


def check(expected, method, path, payload=None, token=None):
    actual, body = request(method, path, payload, token)
    assert actual == expected, f"{method} {path}: expected {expected}, got {actual}: {body}"
    print(f"PASS {actual} {method} {path}")
    return body


suffix = uuid4().hex[:12]
first = check(201, "POST", "/register", {"email": f"nuun-{suffix}@example.com", "password": "password123"})["token"]
second = check(201, "POST", "/register", {"email": f"other-{suffix}@example.com", "password": "password123"})["token"]
item_id = str(uuid4())
valid = {
    "item_id": item_id,
    "type": "lost",
    "name": "Black umbrella",
    "category": "Accessories",
    "location": "KMITL library",
    "description": "Left on the first floor",
}

check(401, "POST", "/items", valid)
check(422, "POST", "/items", {"name": "Missing fields"}, first)
check(422, "POST", "/items", {**valid, "type": "unknown", "item_id": str(uuid4())}, first)
check(422, "POST", "/items", {**valid, "name": "   ", "item_id": str(uuid4())}, first)
created = check(201, "POST", "/items", valid, first)
assert str(created["item_id"]) == item_id and created["status"] == "open"
check(409, "POST", "/items", valid, first)
listed = check(200, "GET", "/items?category=Accessories", token=first)
assert any(str(item["item_id"]) == item_id for item in listed)
check(200, "GET", f"/items/{item_id}", token=first)
check(403, "PATCH", f"/items/{item_id}", {"name": "Changed"}, second)
changed = check(200, "PATCH", f"/items/{item_id}", {"location": "Engineering building"}, first)
assert changed["location"] == "Engineering building"
claimed = check(200, "PATCH", f"/items/{item_id}/claim", token=first)
assert claimed["status"] == "claimed"
check(409, "PATCH", f"/items/{item_id}/claim", token=first)
print("All item smoke checks passed.")

# Week 3: live PostgreSQL checks (creates reports; no table reset).
extra = check(201, "POST", "/items", {
    **valid, "item_id": str(uuid4()), "colour": " Black ", "brand": " Acme "
}, first)
assert extra["colour"] == "Black" and extra["brand"] == "Acme"
assert extra["created_at"] and extra["claimed_at"] is None
extra_path = f'/items/{extra["item_id"]}'
check(403, "PATCH", extra_path + "/claim", token=second)
check(403, "DELETE", extra_path, token=second)
check(422, "PATCH", extra_path, {"organization_id": 999}, first)
check(422, "PATCH", extra_path, {"status": "claimed"}, first)
check(422, "PATCH", extra_path, {"name": None}, first)
check(403, "GET", "/admin/items", token=first)
filtered = check(200, "GET", "/items?item_type=lost&colour=Black&brand=Acme", token=first)
assert any(row["item_id"] == extra["item_id"] for row in filtered)
archived = check(200, "DELETE", extra_path, token=first)
assert archived["status"] == "archived" and archived["archived_at"]
check(409, "DELETE", extra_path, token=first)
check(409, "PATCH", extra_path + "/claim", token=first)
check(409, "PATCH", extra_path, {"name": "No"}, first)
assert claimed["claimed_at"] and claimed["claimed_at"] == claimed["updated_at"]
print("All Week 3 live item smoke checks passed.")
