import asyncio
import logging
import os
import re
import secrets
import smtplib
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from database import create_user, database, get_user_by_email, update_user_token

router = APIRouter()
logger = logging.getLogger("auth")
bearer = HTTPBearer(auto_error=False)

# Keep these two names: routes/items.py imports them.
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET is not set. Add it to acpapp/.env (see .env.example).")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

REQUIRE_EMAIL_VERIFICATION = os.getenv("REQUIRE_EMAIL_VERIFICATION", "false").lower() == "true"
ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "").strip().lower()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_PASSWORD_BYTES = 72  # bcrypt limit

# Brute-force protection (in memory, per email)
MAX_FAILED_LOGINS = 5
LOCK_WINDOW_SECONDS = 15 * 60
_failed_logins: dict = {}

# Used so unknown emails take as long as known ones
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt())


async def setup_auth_security():
    await database.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE"
    )
    await database.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT")
    await database.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ")


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
    token: Optional[str] = None
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
    return row["role"] if row else "student"


def _recent_failures(email: str) -> list:
    now = time.time()
    attempts = [t for t in _failed_logins.get(email, []) if now - t < LOCK_WINDOW_SECONDS]
    _failed_logins[email] = attempts
    return attempts


def _send_email_sync(to_email: str, link: str):
    msg = EmailMessage()
    msg["Subject"] = "Verify your Lost & Found Tracker account"
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg.set_content(f"Welcome! Confirm your email by opening this link:\n\n{link}\n")
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


async def send_verification(to_email: str, token: str):
    link = f"{FRONTEND_URL}/api/verify-email?token={token}"
    logger.warning("Verification link for %s: %s", to_email, link)
    if SMTP_USER and SMTP_PASSWORD:
        try:
            await asyncio.to_thread(_send_email_sync, to_email, link)
        except Exception:
            logger.exception("Could not send verification email")


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    email = payload.email.strip().lower()

    if len(_recent_failures(email)) >= MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in 15 minutes.",
        )

    user = await get_user_by_email(email)
    password_bytes = payload.password.encode("utf-8")
    stored_hash = user["password"].encode("utf-8") if user else _DUMMY_HASH

    password_ok = (
        len(password_bytes) <= MAX_PASSWORD_BYTES and bcrypt.checkpw(password_bytes, stored_hash)
    )
    if user is None or not password_ok:
        _failed_logins.setdefault(email, []).append(time.time())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if REQUIRE_EMAIL_VERIFICATION:
        row = await database.fetch_one(
            "SELECT email_verified FROM users WHERE email = :email", {"email": email}
        )
        if row and not row["email_verified"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in.",
            )

    _failed_logins.pop(email, None)
    role = await get_role(email)
    token = create_access_token(email, role)
    await update_user_token(email, token)
    await database.execute(
        "UPDATE users SET last_login = NOW() WHERE email = :email", {"email": email}
    )

    return LoginResponse(email=email, token=token, role=role)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    email = payload.email.strip().lower()

    if not EMAIL_PATTERN.match(email) or len(email) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email",
        )
    if ALLOWED_EMAIL_DOMAIN and not email.endswith("@" + ALLOWED_EMAIL_DOMAIN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please use your @{ALLOWED_EMAIL_DOMAIN} email",
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    if len(payload.password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at most 72 characters",
        )

    if await get_user_by_email(email) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password_hash = bcrypt.hashpw(
        payload.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")
    await create_user(email, password_hash)

    role = await get_role(email)

    if REQUIRE_EMAIL_VERIFICATION:
        verification_token = secrets.token_urlsafe(32)
        await database.execute(
            "UPDATE users SET email_verified = FALSE, verification_token = :t WHERE email = :email",
            {"t": verification_token, "email": email},
        )
        await send_verification(email, verification_token)
        return RegisterResponse(
            email=email,
            token=None,
            role=role,
            message="Account created. Check your email to verify it, then log in.",
        )

    token = create_access_token(email, role)
    await update_user_token(email, token)
    return RegisterResponse(
        email=email,
        token=token,
        role=role,
        message="User registered successfully",
    )


@router.get("/verify-email")
async def verify_email(token: str):
    row = await database.fetch_one(
        "SELECT email FROM users WHERE verification_token = :t", {"t": token}
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used verification link",
        )
    await database.execute(
        "UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE email = :email",
        {"email": row["email"]},
    )
    return {"message": "Email verified. You can now log in."}


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Login required")
    try:
        data = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    await database.execute(
        "UPDATE users SET token = NULL WHERE email = :email AND token = :token",
        {"email": data.get("sub"), "token": credentials.credentials},
    )
    return {"message": "Logged out"}