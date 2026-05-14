from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import logging
from storage.supabase_client import supabase, supabase_admin
from storage.model_database import get_all_models
from storage.model_storage import delete_model_from_storage
from storage.model_cache import model_cache
from api.dependencies.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------- Request schemas ----------

class AuthRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Response schemas ----------

class AuthResponse(BaseModel):
    message:      str
    access_token: str        # user stores this and sends in every future request
    token_type:   str = "bearer"
    user_id:      str


# ─────────────────────────────────────────────
# 1. POST /auth/signup
# ─────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def signup(body: AuthRequest):
    """
    Creates a new user account.
    Returns a JWT access_token the user must send in all future requests.
    """
    logger.info("Signup attempt for email: %s", body.email)
    try:
        response = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed. User may already exist.",
            )

        return AuthResponse(
            message      = "Account created successfully. You can now log in.",
            access_token = response.session.access_token,
            user_id      = str(response.user.id),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}",
        )


# ─────────────────────────────────────────────
# 2. POST /auth/login
# ─────────────────────────────────────────────

@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
)
async def login(body: AuthRequest):
    """
    Logs in an existing user.
    Returns a JWT access_token — send this in all future requests as:
    Authorization: Bearer <access_token>
    """
    logger.info("Login attempt for email: %s", body.email)
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )

        if response.user is None or response.session is None:
            logger.warning("Failed login for email: %s", body.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        return AuthResponse(
            message      = "Login successful.",
            access_token = response.session.access_token,
            user_id      = str(response.user.id),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


# ─────────────────────────────────────────────
# 3. POST /auth/logout
# ─────────────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout current user",
)
async def logout():
    """
    Logs out the current session from Supabase.
    Token expires naturally after 1 hour.
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout failed: {str(e)}",
        )


# ─────────────────────────────────────────────
# 4. DELETE /auth/delete-account
# ─────────────────────────────────────────────

@router.delete(
    "/delete-account",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete the logged-in user's account and all their models",
)
async def delete_account(
    user_id: str = Depends(get_current_user),
):
    """
    Permanently deletes the calling user's account.

    Order of operations:
      1. Fetch all models belonging to this user
      2. Delete each model's .pkl file from Supabase Storage  (admin client)
      3. Delete each model's metadata row from DB             (admin client)
      4. Evict each model from in-memory cache
      5. Delete all training job records for this user
      6. Delete the user account from Supabase Auth           (admin client)

    This action cannot be undone.
    """

    # ── Step 1: fetch all models ──
    try:
        models = get_all_models(user_id=user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user models: {str(e)}",
        )

    deleted_models = []
    failed_models  = []

    # ── Steps 2–4: clean up each model ──
    for model in models:
        model_id     = model["model_id"]
        storage_path = model.get("storage_path")

        try:
            # Delete .pkl from Supabase Storage — uses admin client to bypass RLS
            if storage_path:
                delete_model_from_storage(storage_path)

            # Delete metadata row from DB — uses admin client to bypass RLS
            supabase_admin.table("models")\
                .delete()\
                .eq("model_id", model_id)\
                .eq("user_id", user_id)\
                .execute()

            # Evict from in-memory cache
            model_cache.invalidate(model_id)

            deleted_models.append(model_id)

        except Exception as e:
            # Don't stop — keep cleaning up remaining models
            failed_models.append({"model_id": model_id, "error": str(e)})

    # ── Step 5: delete all training job records ──
    # Must be done before deleting the user from auth
    try:
        supabase_admin.table("training_jobs")\
            .delete()\
            .eq("user_id", user_id)\
            .execute()
    except Exception as e:
        # Non-fatal — log and continue
        print(f"Warning: could not delete training jobs for {user_id}: {str(e)}")

    # ── Step 6: delete user from Supabase Auth ──
    # Only supabase_admin (service role key) can do this
    try:
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Models were cleaned up but user account deletion failed: {str(e)}. "
                "Ensure supabase_admin is initialized with the SERVICE ROLE key."
            ),
        )

    return {
        "message":        "Account and all associated models deleted successfully.",
        "user_id":        user_id,
        "models_deleted": deleted_models,
        "models_failed":  failed_models,
    }