from datetime import datetime
from storage.supabase_client import supabase

TABLE = "training_jobs"

def create_job(job_id: str, user_id: str, model_name: str) -> dict:
    """
    Creates a new training job with status 'pending'.
    Called immediately when user hits POST /train/
    """
    row = {
        "job_id":      job_id,
        "user_id":     user_id,
        "status":      "pending",
        "model_name":  model_name,
        "model_id":    None,
        "error":       None,
        "created_at":  datetime.now().isoformat(),
        "updated_at":  datetime.now().isoformat(),
    }

    response = supabase.table(TABLE).insert(row).execute()
    return response.data[0]


def update_job_status(
    job_id: str,
    status: str,
    model_id: str = None,
    error: str = None,
) -> dict:
    """
    Updates job status.
    status options: 'pending' → 'running' → 'completed' or 'failed'
    """
    
    row = {
        "status":     status,
        "updated_at": datetime.now().isoformat(),
    }

    if model_id:
        row["model_id"] = model_id

    if error:
        row["error"] = error[:500]   # trim long errors

    response = (
        supabase.table(TABLE)
        .update(row)
        .eq("job_id", job_id)
        .execute()
    )
    return response.data[0] if response.data else {}


def get_job(job_id: str, user_id: str) -> dict:
    """
    Returns a single job.
    Filters by user_id so users can only see their own jobs.
    """
    response = (
        supabase.table(TABLE)
        .select("*")
        .eq("job_id", job_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data or None


def get_all_jobs_by_user(user_id: str) -> list:
    """
    Returns all training jobs for this user, newest first.
    """
    response = (
        supabase.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def delete_job(job_id: str, user_id: str) -> bool:
    """
    Deletes a job record.
    Only deletes if it belongs to this user.
    """
    supabase.table(TABLE)\
        .delete()\
        .eq("job_id", job_id)\
        .eq("user_id", user_id)\
        .execute()
    return True