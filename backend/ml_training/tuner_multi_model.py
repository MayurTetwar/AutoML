import optuna
import pandas as pd
import warnings
from sklearn.model_selection import cross_val_score, train_test_split, StratifiedKFold, KFold
from sklearn.pipeline import Pipeline

optuna.logging.set_verbosity(optuna.logging.WARNING)

warnings.filterwarnings("ignore", message="Objective did not converge",    category=UserWarning)
warnings.filterwarnings("ignore", message="The max_iter was reached",       category=UserWarning)
warnings.filterwarnings("ignore", message="X does not have valid feature names", category=UserWarning)


# ─────────────────────────────────────────────
# CLASSIFIER BUILDER
# Builds any classifier based on trial suggestion
# ─────────────────────────────────────────────

def _build_classifier(trial, model_name: str, weight):
    n_jobs = 2

    if model_name == "Logistic Regression":
        from sklearn.linear_model import LogisticRegression
        return LogisticRegression(
            C            = trial.suggest_float("lr_C", 0.001, 20.0, log=True),
            solver       = trial.suggest_categorical("lr_solver", ["lbfgs", "liblinear"]),
            class_weight = weight,
            max_iter     = 10000,
            tol          = 1e-4,
            random_state = 42,
            n_jobs       = n_jobs,
        )

    elif model_name == "Ridge Classifier":
        from sklearn.linear_model import RidgeClassifier
        return RidgeClassifier(
            alpha        = trial.suggest_float("rc_alpha", 0.001, 20.0, log=True),
            class_weight = weight,
        )

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestClassifier
        return RandomForestClassifier(
            n_estimators      = trial.suggest_int("rf_n_estimators", 100, 500),
            max_depth         = trial.suggest_int("rf_max_depth", 3, 20),
            min_samples_split = trial.suggest_int("rf_min_samples_split", 2, 12),
            min_samples_leaf  = trial.suggest_int("rf_min_samples_leaf", 1, 8),
            max_features      = trial.suggest_categorical("rf_max_features", ["sqrt", "log2"]),
            class_weight      = weight,
            random_state      = 42,
            n_jobs            = n_jobs,
        )

    elif model_name == "XGBoost":
        from xgboost import XGBClassifier
        return XGBClassifier(
            n_estimators     = trial.suggest_int("xgb_n_estimators", 100, 500),
            max_depth        = trial.suggest_int("xgb_max_depth", 3, 10),
            learning_rate    = trial.suggest_float("xgb_learning_rate", 0.005, 0.3, log=True),
            subsample        = trial.suggest_float("xgb_subsample", 0.5, 1.0),
            colsample_bytree = trial.suggest_float("xgb_colsample_bytree", 0.5, 1.0),
            gamma            = trial.suggest_float("xgb_gamma", 0.0, 5.0),
            min_child_weight = trial.suggest_int("xgb_min_child_weight", 1, 20),
            reg_alpha        = trial.suggest_float("xgb_reg_alpha", 0.0, 2.0),
            reg_lambda       = trial.suggest_float("xgb_reg_lambda", 0.5, 2.0),
            eval_metric      = "logloss",
            random_state     = 42,
            verbosity        = 0,
            n_jobs           = n_jobs,
        )

    elif model_name == "LightGBM":
        from lightgbm import LGBMClassifier
        return LGBMClassifier(
            n_estimators      = trial.suggest_int("lgbm_n_estimators", 100, 500),
            max_depth         = trial.suggest_int("lgbm_max_depth", 3, 12),
            learning_rate     = trial.suggest_float("lgbm_learning_rate", 0.005, 0.3, log=True),
            num_leaves        = trial.suggest_int("lgbm_num_leaves", 20, 200),
            subsample         = trial.suggest_float("lgbm_subsample", 0.5, 1.0),
            colsample_bytree  = trial.suggest_float("lgbm_colsample_bytree", 0.5, 1.0),
            min_child_samples = trial.suggest_int("lgbm_min_child_samples", 5, 100),
            reg_alpha         = trial.suggest_float("lgbm_reg_alpha", 0.0, 2.0),
            reg_lambda        = trial.suggest_float("lgbm_reg_lambda", 0.0, 2.0),
            class_weight      = weight,
            random_state      = 42,
            verbosity         = -1,
            n_jobs            = n_jobs,
        )

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsClassifier
        return KNeighborsClassifier(
            n_neighbors = trial.suggest_int("knn_n_neighbors", 3, 25),
            weights     = trial.suggest_categorical("knn_weights", ["uniform", "distance"]),
            metric      = trial.suggest_categorical("knn_metric", ["euclidean", "manhattan"]),
            n_jobs      = n_jobs,
        )

    raise ValueError(f"Unknown classifier: {model_name}")


# ─────────────────────────────────────────────
# REGRESSOR BUILDER
# ─────────────────────────────────────────────

def _build_regressor(trial, model_name: str):
    n_jobs = 2

    if model_name == "ElasticNet":
        from sklearn.linear_model import ElasticNet
        return ElasticNet(
            alpha    = trial.suggest_float("en_alpha", 0.0001, 10.0, log=True),
            l1_ratio = trial.suggest_float("en_l1_ratio", 0.0, 1.0),
            max_iter = 10000,
            tol      = 1e-4,
        )

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestRegressor
        return RandomForestRegressor(
            n_estimators      = trial.suggest_int("rf_n_estimators", 100, 500),
            max_depth         = trial.suggest_int("rf_max_depth", 3, 20),
            min_samples_split = trial.suggest_int("rf_min_samples_split", 2, 12),
            min_samples_leaf  = trial.suggest_int("rf_min_samples_leaf", 1, 8),
            max_features      = trial.suggest_categorical("rf_max_features", ["sqrt", "log2"]),
            random_state      = 42,
            n_jobs            = n_jobs,
        )

    elif model_name == "XGBoost":
        from xgboost import XGBRegressor
        return XGBRegressor(
            n_estimators     = trial.suggest_int("xgb_n_estimators", 100, 500),
            max_depth        = trial.suggest_int("xgb_max_depth", 3, 10),
            learning_rate    = trial.suggest_float("xgb_learning_rate", 0.005, 0.3, log=True),
            subsample        = trial.suggest_float("xgb_subsample", 0.5, 1.0),
            colsample_bytree = trial.suggest_float("xgb_colsample_bytree", 0.5, 1.0),
            gamma            = trial.suggest_float("xgb_gamma", 0.0, 5.0),
            min_child_weight = trial.suggest_int("xgb_min_child_weight", 1, 20),
            reg_alpha        = trial.suggest_float("xgb_reg_alpha", 0.0, 2.0),
            reg_lambda       = trial.suggest_float("xgb_reg_lambda", 0.5, 2.0),
            random_state     = 42,
            verbosity        = 0,
            n_jobs           = n_jobs,
        )

    elif model_name == "LightGBM":
        from lightgbm import LGBMRegressor
        return LGBMRegressor(
            n_estimators      = trial.suggest_int("lgbm_n_estimators", 100, 500),
            max_depth         = trial.suggest_int("lgbm_max_depth", 3, 12),
            learning_rate     = trial.suggest_float("lgbm_learning_rate", 0.005, 0.3, log=True),
            num_leaves        = trial.suggest_int("lgbm_num_leaves", 20, 200),
            subsample         = trial.suggest_float("lgbm_subsample", 0.5, 1.0),
            colsample_bytree  = trial.suggest_float("lgbm_colsample_bytree", 0.5, 1.0),
            min_child_samples = trial.suggest_int("lgbm_min_child_samples", 5, 100),
            reg_alpha         = trial.suggest_float("lgbm_reg_alpha", 0.0, 2.0),
            reg_lambda        = trial.suggest_float("lgbm_reg_lambda", 0.0, 2.0),
            random_state      = 42,
            verbosity         = -1,
            n_jobs            = n_jobs,
        )

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsRegressor
        return KNeighborsRegressor(
            n_neighbors = trial.suggest_int("knn_n_neighbors", 3, 25),
            weights     = trial.suggest_categorical("knn_weights", ["uniform", "distance"]),
            metric      = trial.suggest_categorical("knn_metric", ["euclidean", "manhattan"]),
            n_jobs      = n_jobs,
        )

    raise ValueError(f"Unknown regressor: {model_name}")


# ─────────────────────────────────────────────
# MAIN — AUTO TUNE ALL MODELS
# Single Optuna study tries ALL models
# ─────────────────────────────────────────────

def tune_auto_select_model(
    preprocessor,
    X_train,
    y_train,
    is_classification: bool,
    use_balanced:      bool = False,
    timeout:           int  = 300,
):
    """
    Runs a single Optuna study across ALL models simultaneously.
    Optuna picks the model type AND its hyperparameters in each trial.
    Returns the best pipeline and the name of the winning model.

    Key difference from tune_selected_model:
        tune_selected_model  → user picks model, Optuna tunes params only
        tune_auto_select_model → Optuna picks model AND tunes params together
    """

    try:
        weight = "balanced" if (is_classification and use_balanced) else None

        # ── Model lists ──
        classifier_models = [
            "Logistic Regression",
            "Ridge Classifier",
            "Random Forest",
            "XGBoost",
            "LightGBM",
            "KNN",
        ]
        regressor_models = [
            "ElasticNet",
            "Random Forest",
            "XGBoost",
            "LightGBM",
            "KNN",
        ]
        model_list = classifier_models if is_classification else regressor_models

        # ── Sample large datasets ──
        if is_classification:
            if len(X_train) > 10000:
                X_tune, _, y_tune, _ = train_test_split(
                    X_train, y_train,
                    train_size=10000, random_state=42, stratify=y_train
                )
            else:
                X_tune, y_tune = X_train, y_train

            cv_strategy = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            scoring     = "f1_weighted"

        else:
            if len(X_train) > 10000:
                X_tune, _, y_tune, _ = train_test_split(
                    X_train, y_train,
                    train_size=10000, random_state=42
                )
            else:
                X_tune, y_tune = X_train, y_train

            cv_strategy = KFold(n_splits=5, shuffle=True, random_state=42)
            scoring     = "r2"

        if not isinstance(X_tune, pd.DataFrame):
            raise ValueError(
                f"X_tune must be a DataFrame, got {type(X_tune)}"
            )

        # ── Objective ──
        def objective(trial):
            try:
                # Optuna picks model name as a hyperparameter
                model_name = trial.suggest_categorical("model_name", model_list)

                if is_classification:
                    model = _build_classifier(trial, model_name, weight)
                else:
                    model = _build_regressor(trial, model_name)

                pipeline = Pipeline(steps=[
                    ("preprocessor", preprocessor),
                    ("model",        model),
                ])

                scores = cross_val_score(
                    pipeline, X_tune, y_tune,
                    cv      = cv_strategy,
                    scoring = scoring,
                    n_jobs  = 1,
                )
                return scores.mean()

            except Exception as e:
                print(f"[auto_tune.objective] Trial failed: {type(e).__name__}: {e}")
                raise optuna.TrialPruned()

        # ── Run study ──
        study = optuna.create_study(
            direction = "maximize",
            sampler   = optuna.samplers.TPESampler(seed=42),
            pruner    = optuna.pruners.MedianPruner(
                n_startup_trials=5, n_warmup_steps=3
            ),
        )
        study.optimize(
            objective,
            timeout          = timeout,
            n_jobs           = 1,
            show_progress_bar= True,
        )

        # ── Get best model name and params ──
        best_params     = study.best_params.copy()
        best_model_name = best_params.pop("model_name")

        print(f"\n  Auto-selected model: {best_model_name}")
        print(f"  Best CV score ({scoring}): {study.best_value:.4f}")

        # ── Build final pipeline with best params ──
        # Re-create model using best params found by Optuna
        # We use a mock trial approach via fixed params
        best_trial = study.best_trial

        if is_classification:
            best_model = _build_classifier(best_trial, best_model_name, weight)
        else:
            best_model = _build_regressor(best_trial, best_model_name)

        best_pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model",        best_model),
        ])

        return best_pipeline, best_model_name

    except Exception as e:
        print(f"[tune_auto_select_model] FATAL: {type(e).__name__}: {e}")
        raise