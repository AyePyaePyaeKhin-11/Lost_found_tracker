import os
os.environ.setdefault("JWT_SECRET", "test-secret-for-unit-tests")

import bcrypt
import jwt
from routes.auth import create_access_token, EMAIL_PATTERN, SECRET_KEY, ALGORITHM


def test_token_contains_email_role_and_expiry():
    token = create_access_token("a@kmitl.ac.th", "free")
    data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert data["sub"] == "a@kmitl.ac.th"
    assert data["role"] == "free"
    assert "exp" in data


def test_tampered_token_is_rejected():
    token = create_access_token("a@kmitl.ac.th", "free")
    bad = token[:-2] + "xx"
    try:
        jwt.decode(bad, SECRET_KEY, algorithms=[ALGORITHM])
        assert False, "tampered token was accepted"
    except jwt.PyJWTError:
        pass


def test_email_pattern():
    assert EMAIL_PATTERN.match("a@kmitl.ac.th")
    assert not EMAIL_PATTERN.match("abc")


def test_bcrypt_hash_verifies_and_is_salted():
    h1 = bcrypt.hashpw(b"password123", bcrypt.gensalt())
    h2 = bcrypt.hashpw(b"password123", bcrypt.gensalt())
    assert bcrypt.checkpw(b"password123", h1)
    assert not bcrypt.checkpw(b"wrong-password", h1)
    assert h1 != h2  # different salts, different hashes