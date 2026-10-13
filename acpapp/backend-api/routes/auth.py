import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from database import create_user, database, get_user_by_email, update_user_token

router = APIRouter()

# Keep these two names: routes/items.py imports them.
SECRET_KEY = os.getenv("JWT_SECRET", "acp-secret-jwt-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Only university accounts can register. Comma-separated list, e.g.
# ALLOWED_EMAIL_DOMAINS="kmitl.ac.th,staff.kmitl.ac.th"
ALLOWED_EMAIL_DOMAINS = [
    d.strip().lower()
    for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "kmitl.ac.th").split(",")
    if d.strip()
]


def normalize_email(email: str) -> str:
    return email.strip().lower()


def is_allowed_domain(email: str) -> bool:
    domain = email.rsplit("@", 1)[-1]
    return domain in ALLOWED_EMAIL_DOMAINS


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    email: str
    token: str
    role: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class RegisterResponse(BaseModel):
    email: str
    token: str
    role: str
    message: str


def create_access_token(email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": email, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_role(email: str) -> str:
    row = await database.fetch_one(
        "SELECT role FROM users WHERE email = :email", {"email": email}
    )
    return row["role"] if row else "free"


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    email = normalize_email(payload.email)
    user = await get_user_by_email(email)

    if user is None or not bcrypt.checkpw(
        payload.password.encode("utf-8"), user["password"].encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact an administrator.",
        )

    role = await get_role(email)
    token = create_access_token(email, role)
    await update_user_token(email, token)
    await database.execute(
        "UPDATE users SET last_login_at = NOW() WHERE email = :email", {"email": email}
    )

    return LoginResponse(email=email, token=token, role=role)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    email = normalize_email(payload.email)
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email",
        )

    if not is_allowed_domain(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please register with your university email (@"
            + " or @".join(ALLOWED_EMAIL_DOMAINS) + ")",
        )

    existing_user = await get_user_by_email(email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    password_hash = bcrypt.hashpw(
        payload.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    await create_user(email, password_hash)

    role = await get_role(email)
    token = create_access_token(email, role)
    await update_user_token(email, token)
    await database.execute(
        "UPDATE users SET last_login_at = NOW() WHERE email = :email", {"email": email}
    )

    return RegisterResponse(
        email=email,
        token=token,
        role=role,
        message="User registered successfully",
    )