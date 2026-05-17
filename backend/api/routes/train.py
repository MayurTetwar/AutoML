from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from api.dependencies.auth import get_current_user
from typing import Annotated
import pandas as pd
import uuid
import io

from ml_training.trainer import start_auto_model_building
from storage.jobs_database import (
    create_job,
    get_job,
    get_all_jobs_by_user,
    update_job_status,
)

router = APIRouter(
    prefix="/train",
    tags=["Training"]
)

classification_models = ["Logistic Regression", "Ridge Classifier", "Random Forest", "XGBoost", "LightGBM", "KNN"]
regression_models     = ["ElasticNet", "Random Forest", "XGBoost", "LightGBM", "KNN"]


# ─────────────────────────────────────────────
# 1. POST /train/
#    Spawns Modal training job — returns job_id instantly
# ─────────────────────────────────────────────

@router.post("/", status_code=202)
async def train(
    file:                        Annotated[UploadFile, File(..., description="CSV or Excel dataset")],
    target_column:               Annotated[str,  Form(..., description="Target column name")],
    problem_type_classification: Annotated[bool, Form(..., description="True = Classification, False = Regression")],
    intensity:                   Annotated[str, Form(..., description="Training intensity — 'low', 'medium', 'high'")],
    model_name:                  Annotated[str,  Form(..., description=f"Classification: {classification_models} | Regression: {regression_models}")],
    user_id: str = Depends(get_current_user),
):
    """
    Starts training on Modal infrastructure and returns job_id immediately.
    Training runs on a separate Modal container with 16GB RAM.
    Use GET /train/status/{job_id} to track progress.
    """

    # ── Validate file type ──
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only .csv or .xlsx files are allowed."
        )

    # ── Read file into DataFrame ──
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), encoding='unicode_escape')
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read file: {str(e)}"
        )

    # ── Validate target column ──
    if target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target_column}' not found. Available: {list(df.columns)}"
        )

    # ── Minimum row check ──
    if len(df) < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset too small ({len(df)} rows). Minimum 100 rows required."
        )

    # Map intensity to timeout seconds
    intensity_map = {
        "low":    60,
        "medium": 180,
        "high":   360,
    }
    if intensity not in intensity_map:
        raise HTTPException(
            status_code=400,
            detail="intensity must be 'low', 'medium', or 'high'."
        )
    timeout = intensity_map[intensity]

    # ── Create job record in DB ──
    job_id = str(uuid.uuid4())
    create_job(
        job_id     = job_id,
        user_id    = user_id,
        model_name = model_name,
    )

    # ── Serialize DataFrame to JSON for Modal ──
    # Modal runs in a separate container so we can't pass DataFrame directly
    # JSON string is the cleanest way to transfer tabular data
    df_json = df.to_json()

    # ── Spawn Modal training job ──
    # .spawn() returns immediately — training runs on Modal's infrastructure
    # No waiting, no blocking, user gets job_id right away
    from modal_app import run_training
    await run_training.spawn.aio(
        job_id       = job_id,
        user_id      = user_id,
        df_json      = df_json,
        target_col   = target_column,
        problem_type = problem_type_classification,
        model_name   = model_name,
        timeout      = timeout,
        file_name    = file.filename,
    )

    return JSONResponse(
        status_code = 202,
        content     = {
            "message":    "Training started on Modal. Poll status endpoint to track progress.",
            "job_id":     job_id,
            "model_name": model_name,
            "status":     "pending",
            "track_url":  f"/train/status/{job_id}",
        }
    )

# ─────────────────────────────────────────────
# 2. GET /train/auto/
#    Spawns Modal (with auto selection of ML model) training job — returns job_id instantly
# ─────────────────────────────────────────────

@router.post("/auto", status_code=202)
async def train_auto(
    file:                        Annotated[UploadFile, File(..., description="CSV or Excel dataset")],
    target_column:               Annotated[str,  Form(..., description="Target column name")],
    problem_type_classification: Annotated[bool, Form(..., description="True = Classification, False = Regression")],
    intensity:                   Annotated[str, Form(..., description="Training intensity — 'low', 'medium', 'high'. Auto mode uses longer timeouts than manual.")],
    user_id: str = Depends(get_current_user),
):
    """
    AUTO mode — Optuna automatically selects the best model AND tunes hyperparameters.
    No model_name required — Optuna tries all models and picks the winner.
 
    Models tried for Classification:
        Logistic Regression, Ridge Classifier, Random Forest, XGBoost, LightGBM, KNN
 
    Models tried for Regression:
        ElasticNet, Random Forest, XGBoost, LightGBM, KNN
 
    Recommended timeout: 300+ seconds so Optuna has enough time to try all models.
    Returns job_id immediately — poll GET /train/status/{job_id} to track progress.
    """
 
    # ── Validate file ──
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only .csv or .xlsx files are allowed."
        )
 
    # ── Read file ──
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), encoding='unicode_escape')
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read file: {str(e)}"
        )
 
    # ── Validate target column ──
    if target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target_column}' not found. Available: {list(df.columns)}"
        )
 
    # ── Minimum row check ──
    if len(df) < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset too small ({len(df)} rows). Minimum 100 rows required."
        )
 
    # Auto mode uses higher timeouts — searches across all models
    intensity_map = {
        "low":    180,
        "medium": 420,
        "high":   900,
    }
    if intensity not in intensity_map:
        raise HTTPException(
            status_code=400,
            detail="intensity must be 'low', 'medium', or 'high'."
        )
    timeout = intensity_map[intensity]

    # ── Create job record ──
    job_id = str(uuid.uuid4())
    create_job(
        job_id     = job_id,
        user_id    = user_id,
        model_name = f"Auto ({intensity} intensity)",
    )
 
    # ── Serialize DataFrame ──
    df_json = df.to_json()
 
    # ── Spawn Modal auto training job ──
    from modal_app import run_auto_training
    await run_auto_training.spawn.aio(
        job_id       = job_id,
        user_id      = user_id,
        df_json      = df_json,
        target_col   = target_column,
        problem_type = problem_type_classification,
        timeout      = timeout,
        file_name    = file.filename,
    )

    # Testing code
    # update_job_status(job_id=job_id, status="running")
    # result = start_auto_model_building(
    #     df           = df,
    #     target_col   = target_column,
    #     problemTypeB = problem_type_classification,
    #     timeout      = timeout,
    #     file_name    = file.filename,
    #     user_id      = user_id,
    # )
    # update_job_status(
    #     job_id   = job_id,
    #     status   = "completed",
    #     model_id = result["model_id"],
    # )
 
    return JSONResponse(
        status_code = 202,
        content     = {
            "message":    "Auto training started. Optuna will select the best model automatically.",
            "job_id":     job_id,
            "model_name": "Auto — Optuna selecting best model",
            "status":     "pending",
            "track_url":  f"/train/status/{job_id}",
        }
    )

# ─────────────────────────────────────────────
# 3. GET /train/status/{job_id}
#    Poll this to check Modal training progress
# ─────────────────────────────────────────────

@router.get("/status/{job_id}", status_code=200)
async def get_training_status(
    job_id:  str,
    user_id: str = Depends(get_current_user),
):
    """
    Poll this after POST /train/ to track training progress.

    Status values:
        pending   → job created, Modal container starting
        running   → training in progress on Modal
        completed → training done, model_id is ready
        failed    → training failed, check error field
    """
    job = get_job(job_id=job_id, user_id=user_id)

    if not job:
        # Job deleted = training completed and cleaned up
        return JSONResponse(status_code=200, content={
            "job_id":  job_id,
            "status":  "completed",
            "message": "Training completed. Check GET /models/ for your model.",
        })

    response = {
        "job_id":     job["job_id"],
        "status":     job["status"],
        "model_name": job["model_name"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }

    if job["status"] == "completed":
        response["model_id"] = job["model_id"]
        response["message"]  = "Training complete. Use model_id to run predictions."

    if job["status"] == "failed":
        response["error"]   = job["error"]
        response["message"] = "Training failed. See error for details."

    return JSONResponse(status_code=200, content=response)


# ─────────────────────────────────────────────
# 4. GET /train/jobs
#    List all training jobs for this user
# ─────────────────────────────────────────────

@router.get("/jobs", status_code=200)
async def list_training_jobs(
    user_id: str = Depends(get_current_user),
):
    """
    Returns all training jobs for the logged-in user, newest first.
    """
    jobs = get_all_jobs_by_user(user_id=user_id)

    return JSONResponse(
        status_code = 200,
        content     = {
            "total": len(jobs),
            "jobs":  jobs,
        }
    )