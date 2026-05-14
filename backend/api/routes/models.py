from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import logging

from api.dependencies.auth import get_current_user
from storage.model_database import (
    get_all_models,
    get_model_by_id,
    delete_model_from_db,
)
from storage.model_storage import delete_model_from_storage
from storage.model_cache import model_cache

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/models",
    tags=["Models"]
)


# ─────────────────────────────────────────────
# HELPERS  (unchanged from your original)
# ─────────────────────────────────────────────

def _get_pipeline(model_id: str, storage_path: str):
    """
    Loads pipeline from in-memory cache.
    On cache miss → downloads from Supabase Storage → stores in cache.
    """
    from storage.model_storage import download_model

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
#    Returns only THIS user's models from Supabase DB
# ─────────────────────────────────────────────

@router.get("/")
async def list_models(
    user_id: str = Depends(get_current_user),   # ← protected
):
    """
    Get all models belonging to the logged-in user.
    Other users' models are never returned.
    """
    logger.info("Listing models for user_id: %s", user_id)
    try:
        models = get_all_models(user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    if not models:
        return JSONResponse(status_code=200, content={
            "total":  0,
            "models": []
        })

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
#    Returns full metadata — only if owned by this user
# ─────────────────────────────────────────────

@router.get("/{model_id}")
async def get_model(
    model_id: str,
    user_id: str = Depends(get_current_user),   # ← protected
):
    """
    Get full metadata of a specific model.
    Returns 403 if the model belongs to a different user.
    """
    model = get_model_by_id(model_id=model_id, user_id=user_id)
    return JSONResponse(status_code=200, content=model)


# ─────────────────────────────────────────────
# 3. GET /models/{model_id}/features
#    Returns expected features — only if owned by this user
# ─────────────────────────────────────────────

@router.get("/{model_id}/features")
async def get_features_endpoint(
    model_id: str,
    user_id: str = Depends(get_current_user),   # ← protected
):
    """
    Get list of features this model expects.
    Call this before /predict to know what to send.
    Returns 403 if the model belongs to a different user.
    """
    model = get_model_by_id(model_id=model_id, user_id=user_id)

    pipeline = _get_pipeline(model_id, model["storage_path"])
    features = _get_feature_names(pipeline)

    # Map transformer name → human-readable type (your original logic)
    feature_info = {}
    try:
        preprocessor = pipeline.named_steps['preprocessor']
        for name, transformer, cols in preprocessor.transformers_:
            for col in cols:
                if name == "num":        feature_info[col] = "float"
                elif name == "num_log":  feature_info[col] = "float"
                elif name == "cat_low":  feature_info[col] = "string"
                elif name == "cat_high": feature_info[col] = "string"
                elif name == "binary":   feature_info[col] = "int (0 or 1)"
                elif name == "bool":     feature_info[col] = "boolean"
                elif name == "datetime": feature_info[col] = "string (date)"
                elif name == "ordinal":  feature_info[col] = "int"
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
#    Prediction — only if owned by this user
# ─────────────────────────────────────────────

@router.post("/{model_id}/predict")
async def predict(
    model_id: str,
    input_data: dict,
    user_id: str = Depends(get_current_user),   # ← protected
):
    """
    Generic prediction endpoint — works for ANY trained model.
    Call /models/{model_id}/features first to see what to send.
    Returns 403 if the model belongs to a different user.
    """
    logger.info("Prediction request for model_id: %s by user_id: %s", model_id, user_id)
    # 1. Ownership check — raises 404 or 403 if needed
    model = get_model_by_id(model_id=model_id, user_id=user_id)

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

    # 7. Build response (your original structure, fully preserved)
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
#    Only if owned by this user
# ─────────────────────────────────────────────

@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    user_id: str = Depends(get_current_user),   # ← protected
):
    """
    Delete a trained model permanently.
    Removes .pkl from Supabase Storage, metadata from DB, and cache entry.
    Returns 403 if the model belongs to a different user.
    """
    # 1. Get model + ownership check
    model = get_model_by_id(model_id=model_id, user_id=user_id)

    model_name   = model.get("model_name", "Unknown")
    problem_type = model.get("problem_type", "Unknown")
    storage_path = model.get("storage_path")

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
        delete_model_from_db(model_id=model_id, user_id=user_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete model metadata from DB: {str(e)}"
        )

    # 4. Remove from in-memory cache
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
# 6. GET /models/cache/stats  (debug — no auth needed)
#    Shows what's currently in the in-memory cache
# ─────────────────────────────────────────────

@router.get("/cache/stats")
async def cache_stats():
    """
    Debug endpoint — shows which models are currently
    in memory, their age, and when they expire.
    No auth required — does not expose any user data.
    """
    return JSONResponse(status_code=200, content=model_cache.stats())