from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np

# ── Supabase helpers (replaces joblib + json file reads) ──
from model_storage.database import get_all_models, get_model_by_id, delete_model_from_db
from model_storage.storage import delete_model_from_storage
from model_storage.model_cache import model_cache

router = APIRouter(
    prefix="/models",
    tags=["Models"]
)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _get_pipeline(model_id: str, storage_path: str):
    """
    Loads pipeline from in-memory cache.
    On cache miss → downloads from Supabase Storage → stores in cache.
    Replaces: joblib.load(f"output_models/{model_id}.pkl")
    """
    from model_storage.storage import download_model

    pipeline = model_cache.get(model_id)

    if pipeline is None:
        print(f"  Cache MISS for {model_id} — downloading from Supabase...")
        pipeline = download_model(storage_path)
        model_cache.set(model_id, pipeline)
    
    return pipeline


def _get_feature_names(pipeline) -> list:
    """Extract expected feature names from the fitted preprocessor."""
    try:
        return pipeline.named_steps['preprocessor']\
                       .feature_names_in_.tolist()
    except AttributeError:
        raise HTTPException(
            status_code=500,
            detail="Could not read model features. Please retrain the model."
        )


def serialize(value):
    """Convert numpy types → Python native for JSON serialization."""
    if isinstance(value, np.integer):  return int(value)
    if isinstance(value, np.floating): return float(round(value, 4))
    if isinstance(value, np.ndarray):  return value.tolist()
    return value


# ─────────────────────────────────────────────
# 1. GET /models/
#    Returns all model summaries from Supabase DB
# ─────────────────────────────────────────────

@router.get("/")
async def list_models():
    """Get all available models from Supabase DB."""
    try:
        models = get_all_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    if not models:
        return JSONResponse(status_code=200, content={
            "total":  0,
            "models": []
        })

    # Shape the summary the same way your old endpoint did
    summary = [
        {
            "model_id":   m["model_id"],
            "model_name": m.get("model_name", "Unknown"),
            "type":       m.get("problem_type", "Unknown"),
            "score":      m.get("score"),
            "created_at": m.get("created_at", "N/A"),
        }
        for m in models
    ]

    return JSONResponse(status_code=200, content={
        "total":  len(summary),
        "models": summary
    })


# ─────────────────────────────────────────────
# 2. GET /models/{model_id}
#    Returns full metadata from Supabase DB
# ─────────────────────────────────────────────

@router.get("/{model_id}")
async def get_model(model_id: str):
    """Get full metadata of a specific model from Supabase DB."""
    try:
        model = get_model_by_id(model_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )

    return JSONResponse(status_code=200, content=model)


# ─────────────────────────────────────────────
# 3. GET /models/{model_id}/features
#    Returns expected features — pipeline loaded via cache
# ─────────────────────────────────────────────

@router.get("/{model_id}/features")
async def get_features_endpoint(model_id: str):
    """
    Get list of features this model expects.
    Call this before /predict to know what to send.
    Pipeline is loaded from cache or Supabase Storage.
    """
    # Get storage_path from DB
    model = get_model_by_id(model_id)
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )

    # Load pipeline (cache-aware)
    pipeline = _get_pipeline(model_id, model["storage_path"])
    features = _get_feature_names(pipeline)

    # Map transformer name → human-readable type (same as your original)
    feature_info = {}
    try:
        preprocessor = pipeline.named_steps['preprocessor']
        for name, transformer, cols in preprocessor.transformers_:
            for col in cols:
                if name == "num":       feature_info[col] = "float"
                elif name == "num_log": feature_info[col] = "float"
                elif name == "cat_low": feature_info[col] = "string"
                elif name == "cat_high":feature_info[col] = "string"
                elif name == "binary":  feature_info[col] = "int (0 or 1)"
                elif name == "bool":    feature_info[col] = "boolean"
                elif name == "datetime":feature_info[col] = "string (date)"
                elif name == "ordinal": feature_info[col] = "int"
    except Exception:
        feature_info = {f: "any" for f in features}

    return JSONResponse(status_code=200, content={
        "model_id":      model_id,
        "feature_count": len(features),
        "features":      feature_info,
        "example_input": {feat: "?" for feat in features}
    })


# ─────────────────────────────────────────────
# 4. POST /models/{model_id}/predict
#    Prediction — pipeline loaded via cache
# ─────────────────────────────────────────────

@router.post("/{model_id}/predict")
async def predict(model_id: str, input_data: dict):
    """
    Generic prediction endpoint — works for ANY trained model.
    Call /models/{model_id}/features first to see what to send.
    Pipeline is served from in-memory cache after first call.
    """
    # 1. Get storage_path from Supabase DB
    model = get_model_by_id(model_id)
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )

    # 2. Load pipeline — cache hit = instant, miss = download from Supabase
    pipeline = _get_pipeline(model_id, model["storage_path"])

    # 3. Get expected features
    expected = _get_feature_names(pipeline)

    # 4. Check for missing features
    missing = [f for f in expected if f not in input_data]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "error":    "Missing features in input",
                "missing":  missing,
                "expected": expected
            }
        )

    # 5. Build DataFrame in correct column order
    try:
        data = pd.DataFrame([{feat: input_data[feat] for feat in expected}])
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input data: {str(e)}"
        )

    # 6. Predict
    try:
        prediction = pipeline.predict(data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

    # 7. Build response — same structure as your original
    result = {
        "model_id":   model_id,
        "prediction": serialize(prediction[0]),
    }

    # Decode label if classification and target_classes saved
    target_classes = model.get("target_classes")
    if target_classes:
        pred_index = int(prediction[0])
        if pred_index < len(target_classes):
            result["prediction_label"] = target_classes[pred_index]

    # Confidence score — only for classifiers that support predict_proba
    if hasattr(pipeline.named_steps['model'], 'predict_proba'):
        try:
            proba = pipeline.predict_proba(data)
            result["confidence"]   = round(float(proba.max()), 4)
            result["confidence_%"] = f"{round(float(proba.max()) * 100, 2)}%"
        except Exception:
            pass

    return JSONResponse(status_code=200, content=result)


# ─────────────────────────────────────────────
# 5. DELETE /models/{model_id}
#    Deletes from Supabase Storage + DB + cache
# ─────────────────────────────────────────────

@router.delete("/{model_id}")
async def delete_model(model_id: str):
    """
    Delete a trained model permanently.
    Removes .pkl from Supabase Storage, metadata from DB, and cache entry.
    """
    # 1. Get model from DB
    model = get_model_by_id(model_id)
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )

    model_name    = model.get("model_name", "Unknown")
    problem_type  = model.get("problem_type", "Unknown")
    storage_path  = model.get("storage_path")

    # 2. Delete .pkl from Supabase Storage
    if storage_path:
        try:
            delete_model_from_storage(storage_path)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete model file from storage: {str(e)}"
            )

    # 3. Delete metadata row from Supabase DB
    try:
        delete_model_from_db(model_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete model metadata from DB: {str(e)}"
        )

    # 4. Evict from in-memory cache
    model_cache.invalidate(model_id)

    return JSONResponse(status_code=200, content={
        "message": f"Model '{model_id}' deleted successfully",
        "deleted_model": {
            "model_id":   model_id,
            "model_name": model_name,
            "type":       problem_type,
        }
    })


# ─────────────────────────────────────────────
# 6. GET /models/cache/stats  (debug endpoint)
#    Shows what's currently in the in-memory cache
# ─────────────────────────────────────────────

@router.get("/cache/stats")
async def cache_stats():
    """
    Debug endpoint — shows which models are currently
    in memory, their age, and when they expire.
    Hit this in your browser to verify caching is working.
    """
    return JSONResponse(status_code=200, content=model_cache.stats())