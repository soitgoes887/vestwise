from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
import base64
import json

from ..config import get_settings

security = HTTPBearer()


def decode_jwt_header(token: str) -> dict:
    """Decode JWT header without verification to inspect algorithm."""
    try:
        header_segment = token.split('.')[0]
        # Add padding if needed
        padding = 4 - len(header_segment) % 4
        if padding != 4:
            header_segment += '=' * padding
        header_bytes = base64.urlsafe_b64decode(header_segment)
        return json.loads(header_bytes)
    except Exception as e:
        return {"error": str(e)}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate Supabase JWT token and return user info.
    """
    settings = get_settings()
    token = credentials.credentials

    # Debug: decode the token header
    header = decode_jwt_header(token)
    token_alg = header.get('alg', 'unknown')
    secret_len = len(settings.supabase_jwt_secret) if settings.supabase_jwt_secret else 0
    secret_preview = settings.supabase_jwt_secret[:10] + "..." if settings.supabase_jwt_secret and len(settings.supabase_jwt_secret) > 10 else "empty"

    try:
        # Supabase uses HS256 with the JWT secret
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
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}. Debug: alg={token_alg}, secret_len={secret_len}, secret_preview={secret_preview}"
        )


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
