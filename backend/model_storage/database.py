from model_storage.supabase_client import supabase

def save_model_to_db(metadata: dict):
    """
    Inserts trained model metadata into Supabase 'models' table.
    If model_id already exists, it updates the row.
    """
    row = {
        "model_id":      metadata["model_id"],
        "file_name":     metadata["file_name"],
        "model_name":    metadata["model_name"],
        "problem_type":  metadata["problem_type"],
        "target_column": metadata["target_column"],
        "score":         metadata["score"],
        "metrics":       metadata["metrics"],   # Supabase handles dict → JSONB
        "dataset_rows":  metadata["dataset_rows"],
        "dataset_cols":  metadata["dataset_cols"],
        "storage_path":  metadata["storage_path"],
        "created_at":    metadata["created_at"],
    }

    response = (
        supabase.table("models")
        .upsert(row)          # insert or update if model_id exists
        .execute()
    )

    if response.data:
        print(f"✅ Metadata saved to Supabase DB: {metadata['model_id']}")
    else:
        print(f"⚠️ DB save warning: {response}")

    return response.data


def get_all_models():
    """
    Returns a summary list of all models, newest first.
    """
    response = (
        supabase.table("models")
        .select("model_id, file_name, model_name, problem_type, target_column, score, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_model_by_id(model_id: str):
    """
    Returns full metadata row for a single model.
    Returns None if not found.
    """
    response = (
        supabase.table("models")
        .select("*")
        .eq("model_id", model_id)
        .single()             # returns one row or raises error
        .execute()
    )
    return response.data if response.data else None


def delete_model_from_db(model_id: str):
    """
    Deletes a model's metadata row from the DB.
    Call this together with delete from storage.
    """
    response = (
        supabase.table("models")
        .delete()
        .eq("model_id", model_id)
        .execute()
    )
    print(f"🗑️ Deleted from DB: {model_id}")
    return response.data    