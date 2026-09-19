from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from database import database

router = APIRouter()


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    created_at: Optional[datetime] = None


def format_product_row(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "price": float(row["price"]),
        "stock": row["stock"],
        "created_at": row["created_at"],
    }


@router.get("/products", response_model=list[ProductResponse])
async def list_products():
    rows = await database.fetch_all("SELECT * FROM products ORDER BY id ASC")
    return [format_product_row(row) for row in rows]


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    row = await database.fetch_one(
        "SELECT * FROM products WHERE id = :id", {"id": product_id}
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return format_product_row(row)


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate):
    row = await database.fetch_one(
        """
        INSERT INTO products (name, description, price, stock)
        VALUES (:name, :description, :price, :stock)
        RETURNING *
        """,
        payload.dict(),
    )
    return format_product_row(row)


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, payload: ProductUpdate):
    existing = await database.fetch_one(
        "SELECT * FROM products WHERE id = :id", {"id": product_id}
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = payload.dict(exclude_unset=True, exclude_none=True)
    if not update_data:
        return format_product_row(existing)

    set_clause = ", ".join(f"{field} = :{field}" for field in update_data.keys())
    update_data["id"] = product_id

    row = await database.fetch_one(
        f"UPDATE products SET {set_clause} WHERE id = :id RETURNING *",
        update_data,
    )
    return format_product_row(row)


@router.delete("/products/{product_id}")
async def delete_product(product_id: int):
    existing = await database.fetch_one(
        "SELECT * FROM products WHERE id = :id", {"id": product_id}
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    await database.execute("DELETE FROM products WHERE id = :id", {"id": product_id})
    return {"message": "Product deleted successfully", "id": product_id}


@router.post("/products/{product_id}/buy", response_model=ProductResponse)
async def buy_product(product_id: int):
    existing = await database.fetch_one(
        "SELECT * FROM products WHERE id = :id", {"id": product_id}
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if existing["stock"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Product is out of stock"
        )

    row = await database.fetch_one(
        "UPDATE products SET stock = stock - 1 WHERE id = :id RETURNING *",
        {"id": product_id},
    )
    return format_product_row(row)