from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging

from api.dependencies.auth import get_current_user
from storage.apikeys_database import (
    create_api_key,
    list_api_keys,
    delete_api_key,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


# ---------- Request schemas ----------


class CreateKeyRequest(BaseModel):
    name: str  # user-friendly label, e.g. "My App", "Testing"


# ---------- Response schemas ----------


class CreateKeyResponse(BaseModel):
    """
    Returned ONCE at creation time — raw_key is never shown again.
    """

    key_id: str
    name: str
    raw_key: str  # shown ONCE — user must copy it now
    key_prefix: str  # e.g. "sk-a3b2f1..."
    created_at: str


class KeySummary(BaseModel):
    """
    Returned when listing keys — raw key is NEVER included.
    """

    key_id: str
    name: str
    key_prefix: str
    created_at: str
    last_used_at: str | None


# ─────────────────────────────────────────────
# 1. POST /api-keys/  → Generate a new API key
# ─────────────────────────────────────────────


@router.post(
    "/",
    response_model=CreateKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new API key",
)
async def generate_api_key(
    body: CreateKeyRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Generate a new API key.

    The raw key is returned ONCE in the response — save it immediately.
    It will NEVER be shown again. Only a hash is stored in the database.

    Use this key in prediction requests:
        X-API-Key: sk-xxxxxxxxxxxxxxxxxxxx
    """
    if not body.name or not body.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Key name is required.",
        )

    logger.info("Generating API key '%s' for user: %s", body.name, user_id)

    try:
        result = create_api_key(user_id=user_id, name=body.name)
    except Exception as e:
        logger.error("Failed to create API key: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate API key: {str(e)}",
        )

    return CreateKeyResponse(**result)


# ─────────────────────────────────────────────
# 2. GET /api-keys/  → List all keys (no raw key)
# ─────────────────────────────────────────────


@router.get(
    "/",
    response_model=list[KeySummary],
    status_code=status.HTTP_200_OK,
    summary="List all API keys",
)
async def list_keys(
    user_id: str = Depends(get_current_user),
):
    """
    Returns all API keys for the current user.

    The raw key value is NEVER returned — only the prefix (first 10 chars),
    name, creation date, and last used date are shown.
    """
    keys = list_api_keys(user_id=user_id)
    return keys


# ─────────────────────────────────────────────
# 3. DELETE /api-keys/{key_id}  → Revoke a key
# ─────────────────────────────────────────────


@router.delete(
    "/{key_id}",
    status_code=status.HTTP_200_OK,
    summary="Revoke (delete) an API key",
)
async def revoke_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user),
):
    """
    Permanently deletes an API key. The key will immediately
    stop working for all API requests. This cannot be undone.
    """
    logger.info("Revoking API key %s for user: %s", key_id, user_id)

    deleted = delete_api_key(key_id=key_id, user_id=user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or does not belong to you.",
        )

    return {"message": "API key revoked successfully.", "key_id": key_id}
