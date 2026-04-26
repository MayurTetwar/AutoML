from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import joblib
import shap
import pandas as pd
import numpy as np
import os
import json

router = APIRouter(
    prefix="/models",
    tags=["Models"]
)

MODELS_DIR     = "output_models"
METADATA_FILE  = f"{MODELS_DIR}/models_metadata.json"

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def load_metadata() -> dict:
    """Load models_metadata.json safely."""
    if not os.path.exists(METADATA_FILE):
        return {}
    with open(METADATA_FILE, 'r') as f:
        return json.load(f)


def load_model(model_id: str):
    """Load .pkl pipeline by model_id."""
    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )
    try:
        return joblib.load(model_path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load model: {str(e)}"
        )


def get_features(pipeline) -> list:
    """Extract expected feature names from pipeline."""
    try:
        return pipeline.named_steps['preprocessor']\
                       .feature_names_in_.tolist()
    except AttributeError:
        raise HTTPException(
            status_code=500,
            detail="Could not read model features. Please retrain the model."
        )


def serialize(value):
    """Convert numpy types → Python native for JSON."""
    if isinstance(value, np.integer):  return int(value)
    if isinstance(value, np.floating): return float(round(value, 4))
    if isinstance(value, np.ndarray):  return value.tolist()
    return value


# ─────────────────────────────────────────────
# 1. GET /models/
#    Returns all model names + IDs
# ─────────────────────────────────────────────
@router.get("/")
async def list_models():
    """Get all available models."""
    data = load_metadata()

    if not data:
        return JSONResponse(status_code=200, content={
            "total":  0,
            "models": []
        })

    # Return summary list — not full metadata
    models = [
        {
            "model_id":   model_id,
            "model_name": info.get("model_name", "Unknown"),
            "type":       "Classification" if info.get("problemTypeB") else "Regression",
            "created_at": info.get("created_at", "N/A"),
        }
        for model_id, info in data.items()
    ]

    return JSONResponse(status_code=200, content={
        "total":  len(models),
        "models": models
    })


# ─────────────────────────────────────────────
# 2. GET /models/{model_id}/
#    Returns full metadata of one model
# ─────────────────────────────────────────────
@router.get("/{model_id}")
async def get_model(model_id: str):
    """Get full metadata of a specific model."""
    data = load_metadata()

    if model_id not in data:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )

    return JSONResponse(status_code=200, content=data[model_id])


# ─────────────────────────────────────────────
# 3. GET /models/{model_id}/features/
#    Returns features the model expects
# ─────────────────────────────────────────────
@router.get("/{model_id}/features")
async def get_features_endpoint(model_id: str):
    """
    Get list of features this model expects.
    Call this before predict to know what to send.
    """
    pipeline = load_model(model_id)
    features = get_features(pipeline)

    # Try to give feature types too — more helpful for user
    feature_info = {}
    try:
        preprocessor = pipeline.named_steps['preprocessor']
        for name, transformer, cols in preprocessor.transformers_:
            for col in cols:
                if name == "num":      feature_info[col] = "float"
                elif name == "num_log":feature_info[col] = "float"
                elif name == "cat_low":feature_info[col] = "string"
                elif name == "cat_high":feature_info[col] = "string"
                elif name == "binary": feature_info[col] = "int (0 or 1)"
                elif name == "bool":   feature_info[col] = "boolean"
                elif name == "datetime":feature_info[col] = "string (date)"
                elif name == "ordinal":feature_info[col] = "int"
    except:
        feature_info = {f: "any" for f in features}

    return JSONResponse(status_code=200, content={
        "model_id":       model_id,
        "feature_count":  len(features),
        "features":       feature_info,
        "example_input":  {feat: "?" for feat in features}
    })

# ─────────────────────────────────────────────
# 4. POST /models/{model_id}/predict/
#    Generic prediction — works for any model
# ─────────────────────────────────────────────
@router.post("/{model_id}/predict")
async def predict(model_id: str, input_data: dict):
    """
    Generic prediction endpoint — works for ANY trained model.\n
    Call /models/{model_id}/features first to see what to send.
    """
    # 1. Load pipeline
    pipeline = load_model(model_id)

    # 2. Get expected features
    expected = get_features(pipeline)

    # 3. Check missing features
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

    # 4. Build DataFrame — only expected features, in correct order
    try:
        data = pd.DataFrame([{
            feat: input_data[feat] for feat in expected
        }])
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input data: {str(e)}"
        )

    # 5. Predict
    try:
        prediction = pipeline.predict(data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

    # 6. Build response
    result = {
        "model_id":   model_id,
        "prediction": serialize(prediction[0]),
    }

    # Confidence score — only for classifiers
    if hasattr(pipeline.named_steps['model'], 'predict_proba'):
        try:
            proba = pipeline.predict_proba(data)
            result["confidence"]   = round(float(proba.max()), 4)
            result["confidence_%"] = f"{round(float(proba.max()) * 100, 2)}%"
        except:
            pass

    return JSONResponse(status_code=200, content=result)


# ─────────────────────────────────────────────
# 5. DELETE /models/{model_id}/
#    Deletes a model (both .pkl file and metadata)
# ─────────────────────────────────────────────
@router.delete("/{model_id}")
async def delete_model(model_id: str):
    """
    Delete a trained model permanently.
    Removes both the .pkl file and metadata entry.
    """
    # 1. Load metadata
    data = load_metadata()

    # 2. Check if model exists
    if model_id not in data:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found."
        )

    # 3. Get model info before deletion
    model_info = data[model_id]
    model_filename = f"{model_id}.pkl"
    model_path = os.path.join(MODELS_DIR, model_filename)

    # 4. Delete .pkl file
    if os.path.exists(model_path):
        try:
            os.remove(model_path)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete model file: {str(e)}"
            )

    # 5. Remove from metadata
    del data[model_id]

    # 6. Save updated metadata
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update metadata: {str(e)}"
        )

    return JSONResponse(status_code=200, content={
        "message":    f"Model '{model_id}' deleted successfully",
        "deleted_model": {
            "model_id":   model_id,
            "model_name": model_info.get("model_name", "Unknown"),
            "type":       model_info.get("problem_type", "Unknown"),
        }
    })