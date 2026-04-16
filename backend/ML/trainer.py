import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score
from .analyzer import analyze_columns
from .preprocessor import auto_drop_columns, decide_preprocessing
from .pipeline_builder import build_pipeline
from .models import getModelB, getModelR
from .tuner import run_tuning

def start_model_building(df, target_col, problemTypeB, withTuning=False):

    # 1. Analyze dataset
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
    for col in drop_cols:
        if col in report:
            del report[col]

    # 3. Decide preprocessing
    preprocess_plan = decide_preprocessing(df, report)

    # 4. Build preprocessor (NO model attached yet)
    preprocessor = build_pipeline(preprocess_plan)

    # 5. Train/Test Split
    X = df.drop(columns=[target_col])
    y = df[target_col]
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    if not withTuning:
        # MANUAL MODE
        modelName = input("Enter name of model: ")

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
                print(f"XGBoost Split — Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

                X_train_pre = pipeline.named_steps['preprocessor'].fit_transform(X_train, y_train)
                X_val_pre   = pipeline.named_steps['preprocessor'].transform(X_val)
                pipeline.named_steps['model'].fit(
                    X_train_pre, y_train,
                    eval_set=[(X_val_pre, y_val)],
                    verbose=False
                )
                pipeline.fitted_ = True

            else:
                print(f"Standard Split — Train={len(X_train_full)}, Test={len(X_test)}")
                pipeline.fit(X_train_full, y_train_full)

            print("Done! Pipeline trained successfully ✅")
            joblib.dump(pipeline, "output_models/model.pkl")
            print("Model saved → output_models/model.pkl 💾")

        except Exception as e:
            print(f"Error during training: {e}")
            return

        # Evaluate
        y_pred = pipeline.predict(X_test)
        if problemTypeB:
            print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
        else:
            print(f"R2 Score : {r2_score(y_test, y_pred):.4f}")

    else:
        # AUTONOMOUS TUNING MODE
        print("\n🔍 Tuning Mode — Auto-Searching for Best Model...")

        try:
            # The new tuner returns 4 values, including the dynamically chosen model name
            best_pipeline, best_model_name, best_params = run_tuning(
                preprocessor      = preprocessor,
                X_train           = X_train_full,
                y_train           = y_train_full,
                is_classification = problemTypeB,
                use_balanced      = use_balanced,
                timeout           = 120  # Seconds
            )
            best_pipeline.fit(X_train_full, y_train_full)
            print("Done! Pipeline trained successfully ✅")
            joblib.dump(best_pipeline, "output_models/model.pkl")
            print("Model saved → output_models/model.pkl 💾")

        except Exception as e:
            print(f"Error during tuning: {e}")
            return

        # Evaluate
        print(f"\nBest Model: {best_model_name} with params {best_params}")
        y_pred = best_pipeline.predict(X_test)
        if problemTypeB:
            print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
        else:
            print(f"R2 Score : {r2_score(y_test, y_pred):.4f}")