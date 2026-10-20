"""
routes/uploads.py - photos for lost / found reports.

POST /api/uploads          (login required) upload one photo, returns {"url": "/api/uploads/<name>"}
GET  /api/uploads/{name}   show a photo (public, so the <img> tag can load it)

The report form uploads the photo first, then sends the returned url as the
item's photo_url. Files are stored in UPLOAD_DIR (default ./uploads). On the
server this folder is a Docker volume, so photos survive redeploys.

Safety:
    - only JPEG, PNG and WebP, checked from the file's first bytes (not its name)
    - at most 5 MB (the browser already shrinks photos to about 1280 px)
    - the server picks the file name (random), so nobody can overwrite files
      or reach other folders
"""

import os
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from auth_dependencies import current_user

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
MAX_BYTES = 5 * 1024 * 1024
NAME_PATTERN = re.compile(r"^[0-9a-f]{32}\.(jpg|png|webp)$")
PHOTO_URL_PATTERN = re.compile(r"^/api/uploads/[0-9a-f]{32}\.(jpg|png|webp)$")
MEDIA_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def detect_image_type(head: bytes):
    """File extension from the first bytes of the file, or None if it isn't an allowed image."""
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    return None


@router.post("/uploads", status_code=201)
async def upload_photo(file: UploadFile = File(...), user=Depends(current_user)):
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Photo is too large (max 5 MB)")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty")
    ext = detect_image_type(data[:16])
    if ext is None:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG or WebP photo")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    return {"url": f"/api/uploads/{name}"}


@router.get("/uploads/{name}")
async def get_photo(name: str):
    if not NAME_PATTERN.match(name):
        raise HTTPException(status_code=404, detail="Photo not found")
    path = UPLOAD_DIR / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(
        path,
        media_type=MEDIA_TYPES[name.rsplit(".", 1)[1]],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
