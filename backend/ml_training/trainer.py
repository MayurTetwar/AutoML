from datetime import datetime

import joblib
import uuid
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score
from .analyzer import analyze_columns
from .preprocessor import auto_drop_columns, decide_preprocessing
from .pipeline_builder import build_pipeline
from .models import getModelB, getModelR
from .tuner import run_tuning

def save_model_metadata(model_id, metadata):
    metadata_file = "output_models/models_metadata.json"
    with open(metadata_file, 'r') as f:
        data = json.load(f)

    data[model_id] = metadata
    with open(metadata_file, 'w') as f:
        json.dump(data, f, indent=4)

def start_model_building(df, target_col, problemTypeB, withTuning=False, modelName=None, timeout=300, file_name=None):
    
    model_id = str(uuid.uuid4())
    
    # 1. Analyze dataset
    report = analyze_columns(df, target_col, is_classification=problemTypeB)

    # Check imbalance status
    use_balanced = False
    if problemTypeB and 'target_imbalance' in report:
        use_balanced = report['target_imbalance']['is_imbalanced']

    # 2. Drop useless columns
    drop_cols, reasons = auto_drop_columns(df, target_col, report)
    df = df.drop(columns=drop_cols)
    for col in drop_cols:
        if col in report:
            del report[col]

    # 3. Decide preprocessing
    preprocess_plan = decide_preprocessing(df, report)

    # 4. Build preprocessor 
    preprocessor = build_pipeline(preprocess_plan)

    # 5. Train/Test Split
    X = df.drop(columns=[target_col])
    y = df[target_col]
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    if not withTuning:
        # print("\n🔍 MANUAL MODE...")
        if problemTypeB:
            model = getModelB(modelName, use_balanced)
        else:
            model = getModelR(modelName)
        
        from sklearn.pipeline import Pipeline
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', model)
        ])

        try:
            if "XGB" in str(type(model)):
                X_train, X_val, y_train, y_val = train_test_split(
                    X_train_full, y_train_full, test_size=0.1, random_state=42
                )

                X_train_pre = pipeline.named_steps['preprocessor'].fit_transform(X_train, y_train)
                X_val_pre   = pipeline.named_steps['preprocessor'].transform(X_val)
                pipeline.named_steps['model'].fit(
                    X_train_pre, y_train,
                    eval_set=[(X_val_pre, y_val)],
                    verbose=False
                )
                pipeline.fitted_ = True

            else:
                pipeline.fit(X_train_full, y_train_full)

            joblib.dump(pipeline, f"output_models/{model_id}.pkl")

        except Exception as e:
            print(f"Error during training: {e}")
            return

        # Evaluate
        y_pred = pipeline.predict(X_test)
        score=0
        if problemTypeB:
            score=accuracy_score(y_test, y_pred)
        else:
            score=r2_score(y_test, y_pred)

        metadata = {
            'File Name': file_name,
            'model_id': model_id,
            'model_name': modelName ,
            'problem_type': 'Classification' if problemTypeB else 'Regression',
            'target_column': target_col,
            'score': score,
            'dataset_shape': df.shape,
            'with_tuning': False,
            'created_at': datetime.now().strftime("%Y-%m-%d / %H:%M:%S")
        }
        save_model_metadata(model_id, metadata)

        return metadata
    
    else:
        # print("\n🔍 Tuning Mode — Auto-Searching for Best Model...")
        try:
            best_pipeline, best_model_name = run_tuning(
                preprocessor      = preprocessor,
                X_train           = X_train_full,
                y_train           = y_train_full,
                is_classification = problemTypeB,
                use_balanced      = use_balanced,
                timeout           = timeout  # Seconds
            )
            best_pipeline.fit(X_train_full, y_train_full)
            joblib.dump(best_pipeline, f"output_models/{model_id}.pkl")

        except Exception as e:
            print(f"Error during tuning: {e}")
            return

        # Evaluate
        y_pred = best_pipeline.predict(X_test)
        score=0
        if problemTypeB:
            score=accuracy_score(y_test, y_pred)
        else:
            score=r2_score(y_test, y_pred)

                # Save metadata
        metadata = {
            'File Name': file_name,
            'model_id': model_id,
            'model_name': best_model_name,
            'problem_type': 'Classification' if problemTypeB else 'Regression',
            'target_column': target_col,
            'score': score,
            'dataset_shape': df.shape,
            'with_tuning': True,
            'created_at': datetime.now().strftime("%Y-%m-%d / %H:%M:%S")
        }
        save_model_metadata(model_id, metadata)

        return metadata
