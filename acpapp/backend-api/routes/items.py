from datetime import datetime
from typing import Literal, Optional
from uuid import UUID, uuid4

from asyncpg.exceptions import UniqueViolationError
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.exc import IntegrityError

from database import database
from auth_dependencies import current_user
from deps import require_role

router = APIRouter(tags=["items"])
require_admin = require_role("admin")


class ItemInput(BaseModel):
    class Config:
        extra = "forbid"


class ItemCreate(ItemInput):
    item_id: Optional[UUID] = None
    type: Literal["lost", "found"]
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=200)
    colour: Optional[str] = Field(default=None, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    photo_url: Optional[str] = None
    contact: Optional[str] = Field(default=None, max_length=255)

    @validator("name", "category", "location", "contact", "colour", "brand")
    def reject_blank(cls, value):
        if value is not None and not value.strip():
            raise ValueError("must not be blank")
        return value.strip() if value is not None else None


class ItemUpdate(ItemInput):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    location: Optional[str] = Field(default=None, min_length=1, max_length=200)
    colour: Optional[str] = Field(default=None, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    photo_url: Optional[str] = None
    contact: Optional[str] = Field(default=None, min_length=1, max_length=255)

    @validator("name", "category", "location", "contact", "colour", "brand")
    def reject_blank(cls, value):
        if value is not None and not value.strip():
            raise ValueError("must not be blank")
        return value.strip() if value is not None else None


class ItemResponse(BaseModel):
    item_id: UUID
    organization_id: int
    reported_by: str
    type: Literal["lost", "found"]
    name: str
    category: str
    location: str
    colour: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    contact: str
    status: Literal["open", "claimed", "archived"]
    date_reported: datetime
    created_at: datetime
    updated_at: datetime
    claimed_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None


async def find_item(item_id: UUID, organization_id: int):
    row = await database.fetch_one(
        "SELECT * FROM items WHERE item_id = :item_id AND organization_id = :organization_id",
        {"item_id": item_id, "organization_id": organization_id},
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


def require_editor(item, user):
    if item["reported_by"] != user["email"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only reporter or admin can edit this item")


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=ItemResponse)
async def create_item(payload: ItemCreate, user=Depends(current_user)):
    item_id = payload.item_id or uuid4()
    try:
        row = await database.fetch_one(
            """
            INSERT INTO items (
                item_id, organization_id, reported_by, type, name, category,
                location, colour, brand, description, photo_url, contact
            ) VALUES (
                :item_id, :organization_id, :reported_by, :type, :name, :category,
                :location, :colour, :brand, :description, :photo_url, :contact
            ) RETURNING *
            """,
            {
                "item_id": item_id,
                "organization_id": user["organization_id"],
                "reported_by": user["email"],
                "type": payload.type,
                "name": payload.name,
                "category": payload.category,
                "location": payload.location,
                "colour": payload.colour,
                "brand": payload.brand,
                "description": payload.description,
                "photo_url": payload.photo_url,
                "contact": payload.contact or user["email"],
            },
        )
    except (IntegrityError, UniqueViolationError):
        raise HTTPException(status_code=409, detail="Item ID already exists")
    return dict(row)


@router.get("/items", response_model=list[ItemResponse])
async def list_items(
    item_status: Optional[Literal["open", "claimed", "archived"]] = None,
    item_type: Optional[Literal["lost", "found"]] = None,
    colour: Optional[str] = None,
    brand: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    user=Depends(current_user),
):
    query = "SELECT * FROM items WHERE organization_id = :organization_id"
    values = {"organization_id": user["organization_id"]}
    for column, value in (("type", item_type), ("colour", colour), ("brand", brand)):
        if value is not None:
            query += f" AND {column} = :{column}"
            values[column] = value.strip()
    if item_status is not None:
        query += " AND status = :item_status"
        values["item_status"] = item_status
    if category:
        query += " AND category ILIKE :category"
        values["category"] = f"%{category}%"
    if location:
        query += " AND location ILIKE :location"
        values["location"] = f"%{location}%"
    query += " ORDER BY date_reported DESC"
    rows = await database.fetch_all(query, values)
    return [dict(row) for row in rows]


@router.get("/admin/items", response_model=list[ItemResponse])
async def admin_items(user=Depends(require_admin)):
    """All statuses in the authenticated admin's organization only."""
    rows = await database.fetch_all(
        "SELECT * FROM items WHERE organization_id = :organization_id "
        "ORDER BY date_reported DESC",
        {"organization_id": user["organization_id"]},
    )
    return [dict(row) for row in rows]


@router.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: UUID, user=Depends(current_user)):
    return dict(await find_item(item_id, user["organization_id"]))


@router.patch("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: UUID, payload: ItemUpdate, user=Depends(current_user)):
    item = await find_item(item_id, user["organization_id"])
    require_editor(item, user)
    if item["status"] != "open":
        raise HTTPException(status_code=409, detail="Only open items can be edited")
    changes = payload.dict(exclude_unset=True)
    if not changes:
        return dict(item)
    if any(changes.get(field) is None for field in ("name", "category", "location", "contact") if field in changes):
        raise HTTPException(status_code=422, detail="Required fields cannot be null")
    # The only column names here come from ItemUpdate, never from request keys directly.
    assignments = ", ".join(f"{field} = :{field}" for field in changes)
    row = await database.fetch_one(
        f"UPDATE items SET {assignments}, updated_at = NOW() "
        "WHERE item_id = :item_id AND organization_id = :organization_id "
        "AND status = 'open' RETURNING *",
        {**changes, "item_id": item_id, "organization_id": user["organization_id"]},
    )
    if row is None:
        raise HTTPException(status_code=409, detail="Item is no longer open")
    return dict(row)


@router.patch("/items/{item_id}/claim", response_model=ItemResponse)
async def claim_item(item_id: UUID, user=Depends(current_user)):
    item = await find_item(item_id, user["organization_id"])
    require_editor(item, user)
    row = await database.fetch_one(
        """
        UPDATE items SET status = 'claimed', claimed_at = NOW(), updated_at = NOW()
        WHERE item_id = :item_id AND organization_id = :organization_id
          AND status = 'open' RETURNING *
        """,
        {"item_id": item_id, "organization_id": user["organization_id"]},
    )
    if row is None:
        raise HTTPException(status_code=409, detail="Item is no longer open")
    return dict(row)


@router.delete("/items/{item_id}", response_model=ItemResponse)
async def archive_item(item_id: UUID, user=Depends(current_user)):
    item = await find_item(item_id, user["organization_id"])
    require_editor(item, user)
    row = await database.fetch_one(
        """
        UPDATE items SET status = 'archived', archived_at = NOW(), updated_at = NOW()
        WHERE item_id = :item_id AND organization_id = :organization_id
          AND status = 'open' RETURNING *
        """,
        {"item_id": item_id, "organization_id": user["organization_id"]},
    )
    if row is None:
        raise HTTPException(status_code=409, detail="Only open items can be archived")
    return dict(row)
