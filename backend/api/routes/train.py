from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from api.dependencies.auth import get_current_user
from typing import Annotated
import pandas as pd
import uuid
import io
import logging

from ml_training.trainer import start_model_building
from storage.jobs_database import (
    create_job,
    update_job_status,
    get_job,
    get_all_jobs_by_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/train",
    tags=["Training"]
)

classification_models = ["Logistic Regression", "Ridge Classifier", "Random Forest", "XGBoost", "LightGBM", "KNN"]
regression_models     = ["ElasticNet", "Random Forest", "XGBoost", "LightGBM", "KNN"]


# ─────────────────────────────────────────────
# BACKGROUND TRAINING FUNCTION
# Runs after endpoint already returned job_id to user
# ─────────────────────────────────────────────

def _run_training_in_background(
    job_id:       str,
    user_id:      str,
    df:           pd.DataFrame,
    target_col:   str,
    problem_type: bool,
    model_name:   str,
    timeout:      int,
    file_name:    str,
):
    logger.info("Starting background training for job_id: %s, user_id: %s, model: %s", job_id, user_id, model_name)
    try:
        # Mark job as running
        update_job_status(job_id=job_id, status="running")

        # Run full ML pipeline — exact same call as your original
        result = start_model_building(
            df           = df,
            target_col   = target_col,
            problemTypeB = problem_type,
            modelName    = model_name,
            timeout      = timeout,
            file_name    = file_name,
            user_id      = user_id,
        )

        # Mark job as completed
        update_job_status(
            job_id   = job_id,
            status   = "completed",
            model_id = result["model_id"],
        )
        logger.info("Training completed successfully for job_id: %s, model_id: %s", job_id, result["model_id"])

    except Exception as e:
        logger.error("Training failed for job_id: %s, error: %s", job_id, str(e))
        # Mark job as failed — store the error message
        update_job_status(
            job_id = job_id,
            status = "failed",
            error  = str(e),
        )


# ─────────────────────────────────────────────
# 1. POST /train/
#    Returns job_id immediately — no more 2 min wait
# ─────────────────────────────────────────────

@router.post("/", status_code=202)
async def train(
    background_tasks:            BackgroundTasks,
    file:                        Annotated[UploadFile, File(..., description="CSV or Excel dataset")],
    target_column:               Annotated[str,  Form(..., description="Target column name")],
    problem_type_classification: Annotated[bool, Form(..., description="True = Classification, False = Regression")],
    timeout:                     Annotated[int,  Form(..., ge=60, description="Tuning timeout in seconds (minimum: 60 Sec)")],
    model_name:                  Annotated[str,  Form(..., description=f"Model name — Classification: {classification_models} | Regression: {regression_models})")],
    user_id: str = Depends(get_current_user),
):
    logger.info(f"[TRAIN REQUEST] user_id={user_id}, file={file.filename}, model={model_name}, target={target_column}")
    """
    Starts training in background and returns job_id immediately.
    Use GET /train/status/{job_id} to track progress.

    Status flow:
        pending → running → completed (or failed)
    """

    # ── Validate file type ──
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        logger.warning("Invalid file type uploaded by user_id: %s, filename: %s", user_id, file.filename)
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

    # ── Create job record in DB ──
    job_id = str(uuid.uuid4())
    create_job(
        job_id     = job_id,
        user_id    = user_id,
        model_name = model_name,
    )

    # ── Start training in background ──
    # Returns immediately after this line — user gets job_id right away
    background_tasks.add_task(
        _run_training_in_background,
        job_id       = job_id,
        user_id      = user_id,
        df           = df,
        target_col   = target_column,
        problem_type = problem_type_classification,
        model_name   = model_name,
        timeout      = timeout,
        file_name    = file.filename,
    )

    # ── Return job_id immediately ──
    return JSONResponse(
        status_code = 202,
        content     = {
            "message":    "Training started successfully. Poll status endpoint to track progress.",
            "job_id":     job_id,
            "model_name": model_name,
            "status":     "pending",
            "track_url":  f"/train/status/{job_id}",
        }
    )


# ─────────────────────────────────────────────
# 2. GET /train/status/{job_id}
#    Poll this to check training progress
# ─────────────────────────────────────────────

@router.get("/status/{job_id}", status_code=200)
async def get_training_status(
    job_id:  str,
    user_id: str = Depends(get_current_user),
):
    """
    Poll this after POST /train/ to track training progress.

    Status values:
        pending   → job created, about to start
        running   → training in progress
        completed → training done, model_id is ready
        failed    → training failed, check error field
    """
    job = get_job(job_id=job_id, user_id=user_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"Job '{job_id}' not found."
        )

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
# 3. GET /train/jobs
#    List all training jobs for this user
# ─────────────────────────────────────────────

@router.get("/jobs", status_code=200)
async def list_training_jobs(
    user_id: str = Depends(get_current_user),
):
    """
    Returns all training jobs for the logged-in user, newest first.
    Shows pending, running, completed and failed jobs.
    """
    jobs = get_all_jobs_by_user(user_id=user_id)

    return JSONResponse(
        status_code = 200,
        content     = {
            "total": len(jobs),
            "jobs":  jobs,
        }
    )