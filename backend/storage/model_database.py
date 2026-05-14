from storage.supabase_client import supabase_admin, supabase
from fastapi import HTTPException, status


def save_model_to_db(metadata: dict) -> dict:
    """
    Inserts trained model metadata into Supabase 'models' table.
    If model_id already exists, it updates the row.
    """
    row = {
        "model_id":      metadata["model_id"],
        "file_name":     metadata["file_name"],
        "model_name":    metadata["model_name"],
        "user_id":       metadata["user_id"],
        "problem_type":  metadata["problem_type"],
        "target_column": metadata["target_column"],
        "score":         metadata["score"],
        "metrics":       metadata["metrics"],
        "dataset_rows":  metadata["dataset_rows"],
        "dataset_cols":  metadata["dataset_cols"],
        "storage_path":  metadata["storage_path"],
        "created_at":    metadata["created_at"],
    }

    response = (
        supabase_admin.table("models")
        .upsert(row)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save model metadata to database.",
        )

    return response.data[0]


def get_all_models(user_id: str) -> list:
    """
    Returns a summary list of all models belonging to this user, newest first.
    """
    response = (
        supabase_admin.table("models")
        .select(
            "model_id, file_name, model_name, problem_type, target_column, score, storage_path, created_at"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_model_by_id(model_id: str, user_id: str) -> dict:
    """
    Returns full metadata row for a single model.

    BUG FIX: your original used .single() then response.data[0]
    — .single() returns the object directly, not a list.
    Fixed to use .maybe_single() which returns None if not found
    instead of raising an exception.
    """
    response = (
        supabase.table("models")
        .select("*")
        .eq("model_id", model_id)
        .maybe_single()        # ← returns None if not found, no crash
        .execute()
    )

    # .maybe_single() puts the row directly in response.data (not a list)
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found.",
        )

    model = response.data      # ← direct dict, not response.data[0]

    # Ownership check
    if model["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this model.",
        )

    return model


def delete_model_from_db(model_id: str, user_id: str) -> bool:
    """
    Deletes a model's metadata row from the DB.
    Ownership is already verified by get_model_by_id before this is called.
    """
    supabase_admin.table("training_jobs")\
        .delete()\
        .eq("model_id", model_id)\
        .eq("user_id", user_id)\
        .execute()

    supabase_admin.table("models")\
        .delete()\
        .eq("model_id", model_id)\
        .eq("user_id", user_id)\
        .execute()

    return True