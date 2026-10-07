from fastapi import Depends, HTTPException
from auth_dependencies import current_user


def require_role(*roles: str):
    async def checker(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
