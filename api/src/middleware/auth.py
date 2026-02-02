from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx

from ..config import get_settings

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate Supabase JWT token and return user info.
    """
    settings = get_settings()
    token = credentials.credentials

    try:
        # Supabase uses HS256 with the JWT secret
        # Force HS256 algorithm regardless of token header to prevent algorithm confusion attacks
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )

        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        return {
            "id": user_id,
            "email": email,
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_optional_user(
    request: Request,
) -> dict | None:
    """
    Optionally get user from token if present.
    Returns None if no valid token.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    try:
        token = auth_header.split(" ")[1]
        settings = get_settings()

        # Supabase uses HS256 with the JWT secret
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except (JWTError, IndexError):
        return None
