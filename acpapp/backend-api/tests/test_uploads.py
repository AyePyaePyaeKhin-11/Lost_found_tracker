"""
tests/test_uploads.py - report photos: POST /api/uploads, GET /api/uploads/{name},
and items only accepting uploaded photo URLs.

Run from acpapp/backend-api with a THROWAWAY database whose name contains "test":

    JWT_SECRET=... POSTGRES_HOST=localhost POSTGRES_DB=lft_test pytest tests/test_uploads.py -v
"""

import asyncio

import pytest
from databases import Database
from fastapi.testclient import TestClient

from database import database

if "test" not in (database.url.database or ""):
    pytest.skip(
        f"Refusing to run: database '{database.url.database}' is not a test database.",
        allow_module_level=True,
    )

import routes.uploads as uploads  # noqa: E402
from app import app  # noqa: E402

PASSWORD = "password123"
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 200          # starts like a real JPEG
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200


async def _drop():
    db = Database(str(database.url))
    await db.connect()
    for t in ("subscription_events", "transactions", "items", "users", "organizations"):
        await db.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    await db.disconnect()


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    asyncio.run(_drop())
    uploads.UPLOAD_DIR = tmp_path_factory.mktemp("uploads")   # don't write into the repo
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def me(client):
    client.post("/api/register", json={"email": "photo@kmitl.ac.th", "password": PASSWORD})
    r = client.post("/api/login", json={"email": "photo@kmitl.ac.th", "password": PASSWORD})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def upload(c, headers, data, name="photo.jpg", ctype="image/jpeg"):
    return c.post("/api/uploads", headers=headers, files={"file": (name, data, ctype)})


def test_upload_and_view_photo(client, me):
    r = upload(client, me, JPEG)
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    assert uploads.PHOTO_URL_PATTERN.match(url)
    got = client.get(url)
    assert got.status_code == 200
    assert got.headers["content-type"] == "image/jpeg"
    assert got.content == JPEG


def test_png_keeps_png_extension(client, me):
    assert upload(client, me, PNG, "x.png", "image/png").json()["url"].endswith(".png")


def test_login_required(client):
    assert upload(client, {}, JPEG).status_code == 401


def test_not_an_image_is_rejected_even_if_named_jpg(client, me):
    r = upload(client, me, b"<script>alert(1)</script>", "evil.jpg", "image/jpeg")
    assert r.status_code == 400


def test_too_large(client, me):
    big = JPEG + b"\x00" * (5 * 1024 * 1024)
    assert upload(client, me, big).status_code == 413


def test_bad_or_missing_names_are_404(client):
    assert client.get("/api/uploads/../../etc/passwd").status_code == 404
    assert client.get("/api/uploads/notahexname.jpg").status_code == 404
    assert client.get("/api/uploads/" + "a" * 32 + ".jpg").status_code == 404


def item(photo_url=None, **extra):
    body = {"type": "found", "name": "Wallet", "category": "Accessories", "location": "Main Gate"}
    if photo_url is not None:
        body["photo_url"] = photo_url
    body.update(extra)
    return body


def test_report_with_uploaded_photo(client, me):
    url = upload(client, me, JPEG).json()["url"]
    r = client.post("/api/items", headers=me, json=item(url, colour="Black", brand="Gucci"))
    assert r.status_code == 201, r.text
    assert r.json()["photo_url"] == url
    assert (r.json()["colour"], r.json()["brand"]) == ("Black", "Gucci")


def test_report_without_photo_still_works(client, me):
    r = client.post("/api/items", headers=me, json=item())
    assert r.status_code == 201
    assert r.json()["photo_url"] is None


def test_links_to_other_websites_are_rejected(client, me):
    r = client.post("/api/items", headers=me, json=item("https://evil.example/x.jpg"))
    assert r.status_code == 422
