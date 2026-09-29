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
