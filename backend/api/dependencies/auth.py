from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from storage.supabase_client import supabase
from storage.apikeys_database import lookup_api_key

# This reads the "Authorization: Bearer <token>" header automatically
# auto_error=False so we can fall through to API key check if no Bearer header
bearer_scheme = HTTPBearer(auto_error=False)

API_KEY_HEADER = "X-API-Key"


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """
    FastAPI dependency — unified auth for BOTH JWT and API key.

    Authentication order:
      1. Check for X-API-Key header → validate via hash lookup in DB
      2. Check for Authorization: Bearer <JWT> → validate via Supabase
      3. If neither is present → 401

    Usage in any endpoint:
        user_id: str = Depends(get_current_user)
    """

    # ── 1. Try API Key auth (X-API-Key header) ──
    api_key = request.headers.get(API_KEY_HEADER)
    if api_key:
        if not api_key.startswith("sk-"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key format. Keys must start with 'sk-'.",
            )

        key_data = lookup_api_key(api_key)
        if key_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key. Check your key or generate a new one.",
            )

        # API key is valid — return the user_id associated with it
        return str(key_data["user_id"])

    # ── 2. Try JWT auth (Authorization: Bearer <token>) ──
    if credentials:
        token = credentials.credentials
        try:
            # Ask Supabase to verify the token and return user info
            response = supabase.auth.get_user(token)

            if response is None or response.user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token. Please log in again.",
                )

            # Return just the user_id string — this is what every endpoint receives
            return str(response.user.id)

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate token. Please log in again.",
            )

    # ── 3. No auth provided at all ──
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a JWT token (Authorization: Bearer <token>) or an API key (X-API-Key: sk-...).",
    )