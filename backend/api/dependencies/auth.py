from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from storage.supabase_client import supabase

# This reads the "Authorization: Bearer <token>" header automatically
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    FastAPI dependency.
    - Reads the JWT token from the request header
    - Verifies it with Supabase
    - Returns the user_id (UUID string)

    Usage in any endpoint:
        user_id: str = Depends(get_current_user)
    """
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

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token. Please log in again.",
        )