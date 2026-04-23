from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Annotated
import pandas as pd
import io
from ml_trianing.trainer import start_model_building

router = APIRouter(       
    prefix="/train",
    tags=["Training"]
)

classification_models = ["Logistic Regression", "Ridge Classifier", "Random Forest", "XGBoost", "LightGBM", "KNN"]
regression_models     = ["ElasticNet", "Random Forest", "XGBoost", "LightGBM", "KNN"]

@router.post("/")         
async def train(
    file:                        Annotated[UploadFile, File(..., description="CSV or Excel dataset")],
    target_column:               Annotated[str,  Form(..., description="Target column name")],
    problem_type_classification: Annotated[bool, Form(..., description="True = Classification, False = Regression")],
    with_tuning:                 Annotated[bool, Form(..., description="True = Optuna tuning, False = manual model")],
    timeout:                     Annotated[int,  Form(ge=60, description="Tuning timeout in seconds (min 60)")] = 300,
    model_name:                  Annotated[str,  Form(description=f"Model name — Classification: {classification_models} | Regression: {regression_models})")] = "Random Forest"
):

    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only .csv or .xlsx files are allowed.")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), encoding='unicode_escape')
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    if target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target_column}' not found. Available: {list(df.columns)}"
        )

    if len(df) < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset too small ({len(df)} rows). Minimum 100 rows required."
        )

    try:
        report = start_model_building(
            df,
            target_col   = target_column,
            problemTypeB = problem_type_classification,
            withTuning   = with_tuning,
            timeout      = timeout,
            modelName    = model_name,
            file_name    = file.filename
        )
        return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")