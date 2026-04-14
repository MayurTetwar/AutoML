import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score
from .analyzer import analyze_columns
from .preprocessor import auto_drop_columns,decide_preprocessing
from .pipeline_builder import build_pipeline
from .models import getModelB,getModelR

def start_model_building(df, target_col, problemTypeB, modelName):
    # 1. Analyze dataset with classification flag
    report = analyze_columns(df, target_col, is_classification=problemTypeB)
    
    # Check imbalance status
    use_balanced = False
    if problemTypeB and 'target_imbalance' in report:
        use_balanced = report['target_imbalance']['is_imbalanced']
        if use_balanced:
            print(f"Class imbalance detected (Ratio: {report['target_imbalance']['ratio']:.2f}). Applying balanced weights.")

    # 2. Drop useless columns
    drop_cols, reasons = auto_drop_columns(df, target_col, report)
    df = df.drop(columns=drop_cols)

    # Clean report
    for col in drop_cols:
        if col in report: del report[col]

    # 3. Decide preprocessing
    preprocess_plan = decide_preprocessing(df, report)

    # 4. Get model 
    if problemTypeB:
        model = getModelB(modelName, use_balanced)
    else:
        model = getModelR(modelName)

    # 5. Build full pipeline
    pipeline = build_pipeline(preprocess_plan, model)

    # 6. Train/Test Split
    X = df.drop(columns=[target_col])
    y = df[target_col]
    X_train_full, X_test, y_train_full, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    try:
        if "XGB" in str(type(model)):
            # For XGBoost, we need a validation split for early stopping
            X_train, X_val, y_train, y_val = train_test_split(X_train_full, y_train_full, test_size=0.1, random_state=42)
            print(f"XGBoost Training - Split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

            X_train_preprocessed = pipeline.named_steps['preprocessor'].fit_transform(X_train, y_train)
            X_val_preprocessed = pipeline.named_steps['preprocessor'].transform(X_val)
            pipeline.named_steps['model'].fit(X_train_preprocessed, y_train, eval_set=[(X_val_preprocessed, y_val)], verbose=False)
            pipeline.fitted_ = True
        else:
            # For other models, use the full training set
            print(f"Standard Training - Split: Train={len(X_train_full)}, Test={len(X_test)}")
            pipeline.fit(X_train_full, y_train_full)
        
        print("Done! Pipeline trained and saved successfully ✅")
        joblib.dump(pipeline, "output_models/model.pkl")
    except Exception as e:
        print(f"Error during training: {e}")

    # 8. Evaluation
    y_pred = pipeline.predict(X_test)
    if problemTypeB:
        print(f"Test Accuracy: {accuracy_score(y_test, y_pred)}")
    else:
        print(f"Test R2 Score: {r2_score(y_test, y_pred)}")