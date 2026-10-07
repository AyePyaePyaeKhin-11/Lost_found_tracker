import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from database import database
from routes.auth import ALGORITHM, SECRET_KEY

bearer = HTTPBearer(auto_error=False)


async def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Login required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await database.fetch_one(
        "SELECT email, organization_id, role, token FROM users WHERE email = :email",
        {"email": email},
    )
    if user is None or user["token"] != credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
