from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from model_storage.supabase_client import supabase, supabase_admin
from model_storage.database import get_all_models
from model_storage.storage import delete_model_from_storage
from model_storage.model_cache import model_cache
from api.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------- Request schemas ----------
class AuthRequest(BaseModel):
    email: EmailStr
    password: str

# ---------- Response schemas ----------
class AuthResponse(BaseModel):
    message: str
    access_token: str        # User stores this and sends it in every future request
    token_type: str = "bearer"
    user_id: str

# ---------- Endpoints ----------
@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def signup(body: AuthRequest):
    """
    Creates a new user account.
    """
    #  Returns a JWT access_token the user must send in all future requests.

    # Request body:
    #     { "email": "user@example.com", "password": "yourpassword" }

    # Response:
    #     { "access_token": "eyJ...", "user_id": "uuid-...", ... }
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
            message="Account created successfully. You can now log in.",
            access_token=response.session.access_token,
            user_id=str(response.user.id),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}",
        )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
)
async def login(body: AuthRequest):
    """
    Logs in an existing user.
    """
    #  Returns a JWT access_token the user must send in all future requests
    # as: Authorization: Bearer <access_token>

    # Request body:
    #     { "email": "user@example.com", "password": "yourpassword" }

    # Response:
    #     { "access_token": "eyJ...", "user_id": "uuid-...", ... }
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )

        if response.user is None or response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        return AuthResponse(
            message="Login successful.",
            access_token=response.session.access_token,
            user_id=str(response.user.id),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout current user",
)
async def logout():
    """
    Logs out the current session from Supabase.
    After this the token is invalidated.
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout failed: {str(e)}",
        )


@router.delete(
    "/delete-account",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete the logged-in user's account and all their models",
)
async def delete_account(
    user_id: str = Depends(get_current_user),   # ← must be logged in
):
    """
    Permanently deletes the calling user's account.
    """
    # What this does in order:
    #   1. Fetches all models belonging to this user
    #   2. Deletes each model's .pkl file from Supabase Storage
    #   3. Deletes each model's metadata row from the DB
    #   4. Evicts each model from the in-memory cache
    #   5. Deletes the user account from Supabase Auth

    # After this call the token is invalid and the account is gone.
    # This action cannot be undone.

    # ── Step 1: fetch all models owned by this user ──
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
            # Delete .pkl from Supabase Storage
            print(storage_path)
            if storage_path:
                delete_model_from_storage(storage_path)

            # Delete metadata row from DB
            supabase_admin.table("models")\
                .delete()\
                .eq("model_id", model_id)\
                .eq("user_id", user_id)\
                .execute()

            # Evict from memory cache
            model_cache.invalidate(model_id)

            deleted_models.append(model_id)

        except Exception as e:
            # Don't stop — try to clean up remaining models
            failed_models.append({"model_id": model_id, "error": str(e)})

    # ── Step 5: delete user from Supabase Auth ──
    # This requires the Supabase service role key (admin client)
    # The regular anon client cannot delete auth users
    try:
        # print(user_id)
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Models were cleaned up but user account deletion failed: {str(e)}. "
                "Ensure your Supabase client is initialized with the SERVICE ROLE key."
            ),
        )

    return {
        "message":        "Account and all associated models deleted successfully.",
        "user_id":        user_id,
        "models_deleted": deleted_models,
        "models_failed":  failed_models,   # empty list if all cleaned up fine
    }