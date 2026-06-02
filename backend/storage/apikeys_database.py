import hashlib
import secrets
import uuid
import logging
from datetime import datetime
from storage.supabase_client import supabase_admin

logger = logging.getLogger(__name__)

TABLE = "api_keys"
KEY_PREFIX = "sk-"
KEY_BYTE_LENGTH = 32  # 256-bit random key


def _hash_key(raw_key: str) -> str:
    """
    SHA-256 hash of the raw API key.
    This is what we store in the database — never the raw key.
    """
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _generate_raw_key() -> str:
    """
    Generate a cryptographically secure API key.
    Format: sk-<64 hex chars>  (256-bit entropy)
    """
    return KEY_PREFIX + secrets.token_hex(KEY_BYTE_LENGTH)


def create_api_key(user_id: str, name: str) -> dict:
    """
    Generates a new API key.

    Returns dict with the raw key ONCE — caller must show it to the user
    and never store it. Only the hash is persisted in the database.
    """
    raw_key = _generate_raw_key()
    key_hash = _hash_key(raw_key)
    key_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    row = {
        "key_id": key_id,
        "user_id": user_id,
        "name": name.strip()[:100],  # cap name at 100 chars
        "key_hash": key_hash,
        "key_prefix": raw_key[:10] + "...",  # store "sk-xxxxxx..." for display
        "created_at": now,
        "last_used_at": None,
    }

    response = supabase_admin.table(TABLE).insert(row).execute()

    if not response.data:
        raise Exception("Failed to save API key to database.")

    saved = response.data[0]

    # Return the raw key exactly once — it is NOT stored anywhere
    return {
        "key_id": saved["key_id"],
        "name": saved["name"],
        "raw_key": raw_key,  # shown to user ONCE
        "key_prefix": saved["key_prefix"],
        "created_at": saved["created_at"],
    }


def list_api_keys(user_id: str) -> list:
    """
    Returns all API keys for a user, newest first.
    Raw key is NEVER returned — only prefix, name, dates.
    """
    response = (
        supabase_admin.table(TABLE)
        .select("key_id, name, key_prefix, created_at, last_used_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def delete_api_key(key_id: str, user_id: str) -> bool:
    """
    Revokes (deletes) an API key. Only deletes if owned by user_id.
    """
    response = (
        supabase_admin.table(TABLE)
        .delete()
        .eq("key_id", key_id)
        .eq("user_id", user_id)
        .execute()
    )
    # If nothing was deleted, the key doesn't exist or doesn't belong to this user
    if not response.data:
        return False
    return True


def delete_all_api_keys_for_user(user_id: str) -> int:
    """
    Deletes all API keys for a user. Used during account deletion.
    Returns the count of deleted keys.
    """
    response = supabase_admin.table(TABLE).delete().eq("user_id", user_id).execute()
    return len(response.data) if response.data else 0


def lookup_api_key(raw_key: str) -> dict | None:
    """
    Looks up an API key by its hash.

    Called during authentication — hashes the incoming raw key,
    searches the database for a matching hash, and returns the
    associated user_id.

    Also updates last_used_at timestamp.

    Returns: {"user_id": "...", "key_id": "...", "name": "..."} or None
    """
    key_hash = _hash_key(raw_key)

    response = (
        supabase_admin.table(TABLE)
        .select("key_id, user_id, name")
        .eq("key_hash", key_hash)
        .maybe_single()
        .execute()
    )

    if response is None or response.data is None:
        return None

    key_data = response.data

    # Update last_used_at (fire-and-forget, don't block auth on this)
    try:
        supabase_admin.table(TABLE).update(
            {"last_used_at": datetime.now().isoformat()}
        ).eq("key_id", key_data["key_id"]).execute()
    except Exception:
        # Non-critical — don't fail auth if timestamp update fails
        logger.warning("Failed to update last_used_at for key %s", key_data["key_id"])

    return key_data
