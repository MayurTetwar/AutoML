import io
import joblib
from model_storage.supabase_client import supabase_admin

BUCKET_NAME = "models"   # must match the bucket you created in Supabase dashboard


def upload_model(pipeline, model_id: str) -> str:
    """
    Serializes the sklearn pipeline with joblib,
    uploads it to Supabase Storage bucket 'models'.

    Returns the storage path string e.g. 'models/abc-123.pkl'
    This path is saved in the DB and used later for download.
    """
    # Serialize pipeline to bytes in memory — no temp file needed
    buffer = io.BytesIO()
    joblib.dump(pipeline, buffer)
    buffer.seek(0)
    file_bytes = buffer.read()

    storage_path = f"models/{model_id}.pkl"

    response = supabase_admin.storage.from_(BUCKET_NAME).upload(
        path         = storage_path,
        file         = file_bytes,
        file_options = {"content-type": "application/octet-stream"}
    )

    # print(f"✅ Model uploaded to Supabase Storage: {storage_path}")
    return storage_path


def download_model(storage_path: str):
    """
    Downloads the .pkl bytes from Supabase Storage,
    deserializes with joblib and returns the sklearn pipeline.
    """
    file_bytes = supabase_admin.storage.from_(BUCKET_NAME).download(storage_path)

    buffer = io.BytesIO(file_bytes)
    pipeline = joblib.load(buffer)

    # print(f"✅ Model downloaded from Supabase Storage: {storage_path}")
    return pipeline


def delete_model_from_storage(storage_path: str):
    """
    Deletes the .pkl file from Supabase Storage bucket.
    """
    response = supabase_admin.storage.from_(BUCKET_NAME).remove([storage_path])
    # print(f"🗑️ Deleted from Storage: {storage_path}")
    return response