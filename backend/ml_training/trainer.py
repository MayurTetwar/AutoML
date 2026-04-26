from datetime import datetime

import joblib
import uuid
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, r2_score,
    f1_score, mean_absolute_error, mean_squared_error
)
from .analyzer import analyze_columns
from .preprocessor import auto_drop_columns, decide_preprocessing
from .pipeline_builder import build_pipeline
from .tuner import tune_selected_model


# ─────────────────────────────────────────────
# METADATA HELPER
# ─────────────────────────────────────────────

def save_model_metadata(model_id, metadata):
    metadata_file = "output_models/models_metadata.json"
    with open(metadata_file, 'r') as f:
        data = json.load(f)

    data[model_id] = metadata

    with open(metadata_file, 'w') as f:
        json.dump(data, f, indent=4)


# ─────────────────────────────────────────────
# EVALUATION HELPER
# ─────────────────────────────────────────────

def _evaluate(pipeline, X_test, y_test, is_classification):
    """Returns primary score + full metrics dict."""
    y_pred = pipeline.predict(X_test)

    if is_classification:
        score = accuracy_score(y_test, y_pred)
        metrics = {
            "accuracy":    round(float(score), 4),
            "f1_weighted": round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        }
    else:
        score = r2_score(y_test, y_pred)
        mae   = mean_absolute_error(y_test, y_pred)
        rmse  = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        metrics = {
            "r2":   round(float(score), 4),
            "mae":  round(float(mae), 4),
            "rmse": round(float(rmse), 4),
        }

    return float(score), metrics


# ─────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────

def start_model_building(df, target_col, problemTypeB,
                         modelName=None, timeout=300, file_name=None):
    """
    Always tunes the selected model using focused Optuna search.
    Removed with_tuning toggle — tuning is always ON for better accuracy.
    """

    model_id = str(uuid.uuid4())

    # ── 1. Analyze dataset ─────────────────────
    report = analyze_columns(df, target_col, is_classification=problemTypeB)

    # Check class imbalance for classification
    use_balanced = False
    if problemTypeB and 'target_imbalance' in report:
        use_balanced = report['target_imbalance']['is_imbalanced']

    # ── 2. Drop useless columns ────────────────
    drop_cols, reasons = auto_drop_columns(df, target_col, report)
    df = df.drop(columns=drop_cols)
    for col in drop_cols:
        if col in report:
            del report[col]

    # ── 3. Decide preprocessing ────────────────
    preprocess_plan = decide_preprocessing(df, report)

    # ── 4. Build preprocessor ──────────────────
    preprocessor = build_pipeline(preprocess_plan)

    # ── 5. Train / Test split ──────────────────
    X = pd.DataFrame(df.drop(columns=[target_col]))
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42,
        stratify=y if problemTypeB else None
    )

    if problemTypeB:
        label_encoder = LabelEncoder()
        y_train = pd.Series(label_encoder.fit_transform(y_train), index=y_train.index)
        y_test = pd.Series(label_encoder.transform(y_test), index=y_test.index)
    else:
        label_encoder = None

    # ── 6. Tune selected model with Optuna ─────
    try:
        best_pipeline = tune_selected_model(
            preprocessor      = preprocessor,
            X_train           = X_train,
            y_train           = y_train,
            model_name        = modelName,
            is_classification = problemTypeB,
            use_balanced      = use_balanced,
            timeout           = timeout,
        )
        best_pipeline.fit(X_train, y_train)  
        # Fit the pipeline with best parameters on full training data
        joblib.dump(best_pipeline, f"output_models/{model_id}.pkl")

    except Exception as e:
        print(f"  Error during tuning: {e}")
        return None

    # ── 7. Evaluate ────────────────────────────
    score, metrics = _evaluate(best_pipeline, X_test, y_test, problemTypeB)

    # ── 8. Save metadata ───────────────────────
    metadata = {
        'File Name':     file_name,
        'model_id':      model_id,
        'model_name':    modelName,
        'problem_type':  'Classification' if problemTypeB else 'Regression',
        'target_column': target_col,
        'score':         score,       # primary score (backward compat)
        'metrics':       metrics,     # all metrics
        'dataset_shape': list(df.shape),
        'created_at':    datetime.now().strftime("%Y-%m-%d / %H:%M:%S")
    }
    if label_encoder is not None:
        metadata['target_classes'] = label_encoder.classes_.tolist()
    save_model_metadata(model_id, metadata)

    return metadata