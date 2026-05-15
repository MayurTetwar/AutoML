import modal

# ─────────────────────────────────────────────
# IMAGE
# Exact versions from your requirements.txt
# ─────────────────────────────────────────────

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        # Data
        "pandas==2.2.0",
        "numpy==1.26.4",

        # ML
        "scikit-learn==1.4.0",
        "xgboost==2.0.3",
        "lightgbm==4.3.0",
        "optuna==3.5.0",
        "joblib==1.3.2",
        "category-encoders==2.6.3",

        # FastAPI
        "fastapi==0.110.0",
        "uvicorn==0.27.0",
        "pydantic[email]==2.13.2",
        "python-multipart==0.0.9",

        # Utils
        "uuid6==2025.0.1",
        "supabase==2.29.0",
        "python-dotenv==1.2.2",
        "openpyxl",          # excel support — no strict version needed
    ).add_local_dir(".", remote_path="/root")
)

# ─────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────

app = modal.App(
    name  = "automl-api",
    image = image,
)


# ─────────────────────────────────────────────
# SECRETS
# Run this ONCE in your terminal before deploying:
#
# modal secret create automl-secrets \
#   SUPABASE_URL=your-url \
#   SUPABASE_ANON_KEY=your-anon-key \
#   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# ─────────────────────────────────────────────

secrets = [modal.Secret.from_name("automl-secrets")]

# ─────────────────────────────────────────────
# FASTAPI — runs your entire API on Modal
# memory=1024  → 1GB RAM — lightweight, just routing requests
# cpu=2        → 2 cores — enough for API layer
# timeout=60   → 60 sec max per single request
# allow_concurrent_inputs=10 → handle 10 requests at once
# ─────────────────────────────────────────────

@app.function(
    secrets = secrets,
    cpu     = 4,
    memory  = 16384,
    timeout = 3600,
)
def run_training(
    job_id:       str,
    user_id:      str,
    df_json:      str,
    target_col:   str,
    problem_type: bool,
    model_name:   str,
    timeout:      int,
    file_name:    str,
):
    import pandas as pd
    from storage.jobs_database import update_job_status
    from ml_training.trainer import start_model_building

    try:
        df = pd.read_json(df_json)

        update_job_status(job_id=job_id, status="running")

        result = start_model_building(
            df           = df,
            target_col   = target_col,
            problemTypeB = problem_type,
            modelName    = model_name,
            timeout      = timeout,
            file_name    = file_name,
            user_id      = user_id,
        )

        update_job_status(
            job_id   = job_id,
            status   = "completed",
            model_id = result["model_id"],
        )

    except Exception as e:
        update_job_status(
            job_id = job_id,
            status = "failed",
            error  = str(e),
        )
        raise

@app.function(
    secrets = secrets,
    cpu     = 2,
    memory  = 1024,
    timeout = 60,
)
@modal.concurrent(max_inputs=10)
@modal.asgi_app()
def fastapi_app():
    from main import app as _app
    return _app

# ─────────────────────────────────────────────
# COMMANDS
#
# 1. Create secrets (one time only):
#    modal secret create automl-secrets \
#      SUPABASE_URL=xxx \
#      SUPABASE_ANON_KEY=xxx \
#      SUPABASE_SERVICE_ROLE_KEY=xxx
#
# 2. Test locally:
#    modal serve modal_app.py
#
# 3. Deploy permanently:
#    modal deploy modal_app.py
#
# Your live URL will be:
#    https://your-workspace--automl-api-fastapi-app.modal.run
# ─────────────────────────────────────────────