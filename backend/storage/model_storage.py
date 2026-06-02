import io
import joblib
import zipfile
from storage.supabase_client import supabase_admin

BUCKET_NAME = "models"  # must match the bucket you created in Supabase dashboard


def upload_model(pipeline, model_id: str) -> str:
    """
    Serializes the sklearn pipeline with joblib, zips it,
    and uploads it to Supabase Storage bucket 'models'.

    Returns the storage path string e.g. 'models/abc-123.zip'
    This path is saved in the DB and used later for download.
    """
    # Serialize pipeline to bytes in memory
    pkl_buffer = io.BytesIO()
    joblib.dump(pipeline, pkl_buffer)
    pkl_bytes = pkl_buffer.getvalue()

    # Zip the bytes in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("model.pkl", pkl_bytes)
    zip_bytes = zip_buffer.getvalue()

    storage_path = f"models/{model_id}.zip"

    response = supabase_admin.storage.from_(BUCKET_NAME).upload(
        path=storage_path,
        file=zip_bytes,
        file_options={"content-type": "application/zip"},
    )

    # print(f"✅ Model uploaded to Supabase Storage: {storage_path}")
    return storage_path


def download_model(storage_path: str):
    """
    Downloads the model bytes from Supabase Storage,
    unzips it (if it's a zip), deserializes with joblib and returns the sklearn pipeline.
    """
    file_bytes = supabase_admin.storage.from_(BUCKET_NAME).download(storage_path)

    zip_buffer = io.BytesIO(file_bytes)
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        pkl_bytes = zf.read("model.pkl")
    buffer = io.BytesIO(pkl_bytes)

    pipeline = joblib.load(buffer)

    # print(f"✅ Model downloaded from Supabase Storage: {storage_path}")
    return pipeline


def delete_model_from_storage(storage_path: str):
    """
    Deletes the model file from Supabase Storage bucket.
    """
    response = supabase_admin.storage.from_(BUCKET_NAME).remove([storage_path])
    # print(f"🗑️ Deleted from Storage: {storage_path}")
    return response
