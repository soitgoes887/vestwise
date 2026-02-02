from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
import httpx
import base64
import json
from functools import lru_cache

from ..config import get_settings

security = HTTPBearer()

# Cache for JWKS
_jwks_cache: dict | None = None


async def get_jwks(supabase_url: str) -> dict:
    """Fetch JWKS from Supabase."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


def get_signing_key(jwks: dict, token: str) -> str:
    """Get the signing key from JWKS that matches the token's kid."""
    # Decode header to get kid
    header_segment = token.split('.')[0]
    padding = 4 - len(header_segment) % 4
    if padding != 4:
        header_segment += '=' * padding
    header = json.loads(base64url_decode(header_segment.encode()))

    kid = header.get('kid')

    for key in jwks.get('keys', []):
        if key.get('kid') == kid:
            return key

    raise ValueError(f"No matching key found for kid: {kid}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate Supabase JWT token and return user info.
    """
    settings = get_settings()
    token = credentials.credentials

    try:
        # Fetch JWKS from Supabase
        jwks = await get_jwks(settings.supabase_url)

        # Get the signing key
        signing_key = get_signing_key(jwks, token)

        # Decode and verify the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
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
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch JWKS: {str(e)}")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")


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

        # Fetch JWKS from Supabase
        jwks = await get_jwks(settings.supabase_url)

        # Get the signing key
        signing_key = get_signing_key(jwks, token)

        # Decode and verify the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"verify_aud": True},
        )

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except Exception:
        return None
