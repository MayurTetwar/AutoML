import optuna
import pandas as pd
import numpy as np
import warnings
from sklearn.model_selection import (
    cross_val_score,
    train_test_split,
    StratifiedKFold,
    KFold,
)
from sklearn.pipeline import Pipeline
from .models import _build_best_regressor, _build_best_classifier

optuna.logging.set_verbosity(optuna.logging.WARNING)

# Suppress warnings
warnings.filterwarnings(
    "ignore", message="Objective did not converge", category=UserWarning
)
warnings.filterwarnings(
    "ignore", message="The max_iter was reached", category=UserWarning
)
warnings.filterwarnings(
    "ignore", message="X does not have valid feature names", category=UserWarning
)


def _build_classifier(trial, model_name, weight):
    """Returns a classifier with tunable params for the selected model only."""

    n_jobs = 2
    if model_name == "Logistic Regression":
        from sklearn.linear_model import LogisticRegression

        return LogisticRegression(
            C=trial.suggest_float("C", 0.001, 20.0, log=True),
            solver=trial.suggest_categorical(
                "solver", ["lbfgs", "liblinear"]
            ),  # Removed saga which was causing convergence issues
            class_weight=weight,
            max_iter=10000,
            tol=1e-4,  # Add tolerance for better convergence
            random_state=42,
            n_jobs=n_jobs,
        )

    elif model_name == "Ridge Classifier":
        from sklearn.linear_model import RidgeClassifier

        return RidgeClassifier(
            alpha=trial.suggest_float("alpha", 0.001, 20.0, log=True),
            class_weight=weight,
        )

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestClassifier

        return RandomForestClassifier(
            n_estimators=trial.suggest_int("n_estimators", 100, 600),
            max_depth=trial.suggest_int("max_depth", 3, 20),
            min_samples_split=trial.suggest_int("min_samples_split", 2, 12),
            min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 8),
            max_features=trial.suggest_categorical("max_features", ["sqrt", "log2"]),
            class_weight=weight,
            random_state=42,
            n_jobs=n_jobs,
        )

    elif model_name == "XGBoost":
        from xgboost import XGBClassifier

        return XGBClassifier(
            n_estimators=trial.suggest_int("n_estimators", 100, 600),
            max_depth=trial.suggest_int("max_depth", 3, 10),
            learning_rate=trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
            subsample=trial.suggest_float("subsample", 0.5, 1.0),
            colsample_bytree=trial.suggest_float("colsample_bytree", 0.5, 1.0),
            gamma=trial.suggest_float("gamma", 0.0, 5.0),
            min_child_weight=trial.suggest_int("min_child_weight", 1, 20),
            max_bin=trial.suggest_int("max_bin", 64, 512),
            reg_alpha=trial.suggest_float("reg_alpha", 0.0, 2.0),
            reg_lambda=trial.suggest_float("reg_lambda", 0.5, 2.0),
            eval_metric="logloss",
            random_state=42,
            verbosity=0,
            n_jobs=n_jobs,
        )

    elif model_name == "LightGBM":
        from lightgbm import LGBMClassifier

        return LGBMClassifier(
            n_estimators=trial.suggest_int("n_estimators", 100, 600),
            max_depth=trial.suggest_int("max_depth", 3, 12),
            learning_rate=trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
            num_leaves=trial.suggest_int("num_leaves", 20, 200),
            subsample=trial.suggest_float("subsample", 0.5, 1.0),
            colsample_bytree=trial.suggest_float("colsample_bytree", 0.5, 1.0),
            min_child_samples=trial.suggest_int("min_child_samples", 5, 100),
            min_split_gain=trial.suggest_float("min_split_gain", 0.0, 1.0),
            bagging_freq=trial.suggest_int("bagging_freq", 1, 7),
            reg_alpha=trial.suggest_float("reg_alpha", 0.0, 2.0),
            reg_lambda=trial.suggest_float("reg_lambda", 0.0, 2.0),
            class_weight=weight,
            random_state=42,
            verbosity=-1,
            n_jobs=n_jobs,
        )

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsClassifier

        return KNeighborsClassifier(
            n_neighbors=trial.suggest_int("n_neighbors", 3, 25),
            weights=trial.suggest_categorical("weights", ["uniform", "distance"]),
            metric=trial.suggest_categorical("metric", ["euclidean", "manhattan"]),
            n_jobs=n_jobs,
        )

    raise ValueError(f"Unknown classifier: {model_name}")


def _build_regressor(trial, model_name):
    """Returns a regressor with tunable params for the selected model only."""

    n_jobs = 2
    if model_name == "ElasticNet":
        from sklearn.linear_model import ElasticNet

        return ElasticNet(
            alpha=trial.suggest_float("alpha", 0.0001, 10.0, log=True),
            l1_ratio=trial.suggest_float("l1_ratio", 0.0, 1.0),
            max_iter=10000,
            tol=1e-4,  # Add tolerance for better convergence
        )

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestRegressor

        return RandomForestRegressor(
            n_estimators=trial.suggest_int("n_estimators", 100, 600),
            max_depth=trial.suggest_int("max_depth", 3, 20),
            min_samples_split=trial.suggest_int("min_samples_split", 2, 12),
            min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 8),
            max_features=trial.suggest_categorical("max_features", ["sqrt", "log2"]),
            random_state=42,
            n_jobs=n_jobs,
        )

    elif model_name == "XGBoost":
        from xgboost import XGBRegressor

        return XGBRegressor(
            n_estimators=trial.suggest_int("n_estimators", 100, 600),
            max_depth=trial.suggest_int("max_depth", 3, 10),
            learning_rate=trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
            subsample=trial.suggest_float("subsample", 0.5, 1.0),
            colsample_bytree=trial.suggest_float("colsample_bytree", 0.5, 1.0),
            gamma=trial.suggest_float("gamma", 0.0, 5.0),
            max_bin=trial.suggest_int("max_bin", 64, 512),
            min_child_weight=trial.suggest_int("min_child_weight", 1, 20),
            reg_alpha=trial.suggest_float("reg_alpha", 0.0, 2.0),
            reg_lambda=trial.suggest_float("reg_lambda", 0.5, 2.0),
            random_state=42,
            verbosity=0,
            n_jobs=n_jobs,
        )

    elif model_name == "LightGBM":
        from lightgbm import LGBMRegressor

        return LGBMRegressor(
            n_estimators=trial.suggest_int("n_estimators", 100, 600),
            max_depth=trial.suggest_int("max_depth", 3, 12),
            learning_rate=trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
            num_leaves=trial.suggest_int("num_leaves", 20, 200),
            subsample=trial.suggest_float("subsample", 0.5, 1.0),
            colsample_bytree=trial.suggest_float("colsample_bytree", 0.5, 1.0),
            min_child_samples=trial.suggest_int("min_child_samples", 5, 100),
            reg_alpha=trial.suggest_float("reg_alpha", 0.0, 2.0),
            min_split_gain=trial.suggest_float("min_split_gain", 0.0, 1.0),
            bagging_freq=trial.suggest_int("bagging_freq", 1, 7),
            reg_lambda=trial.suggest_float("reg_lambda", 0.0, 2.0),
            random_state=42,
            verbosity=-1,
            n_jobs=n_jobs,
        )

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsRegressor

        return KNeighborsRegressor(
            n_neighbors=trial.suggest_int("n_neighbors", 3, 25),
            weights=trial.suggest_categorical("weights", ["uniform", "distance"]),
            metric=trial.suggest_categorical("metric", ["euclidean", "manhattan"]),
            n_jobs=n_jobs,
        )

    raise ValueError(f"Unknown regressor: {model_name}")


# ─────────────────────────────────────────────
# FOCUSED TUNER — tunes only the selected model
# ─────────────────────────────────────────────


def tune_selected_model(
    preprocessor,
    X_train,
    y_train,
    model_name,
    is_classification,
    use_balanced=False,
    timeout=300,
):
    """
    Focuses ALL Optuna trials on the single model the user selected.
    This is much more efficient than searching across all models.
    """

    try:
        weight = "balanced" if (is_classification and use_balanced) else None

        MAX_TUNE_SAMPLES = min(len(X_train), 10000)
        if len(X_train) > 100000:
            MAX_TUNE_SAMPLES = 15000
        elif len(X_train) > 50000:
            MAX_TUNE_SAMPLES = 12000
        else:
            MAX_TUNE_SAMPLES = 10000

        if is_classification:
            if len(X_train) > 50000:
                X_tune, _, y_tune, _ = train_test_split(
                    X_train,
                    y_train,
                    train_size=MAX_TUNE_SAMPLES,
                    random_state=42,
                    stratify=y_train,
                )
            else:
                X_tune, y_tune = X_train, y_train

            cv_strategy = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            scoring = "f1_weighted"
            direction = "maximize"

        else:
            if len(X_train) > 50000:
                X_tune, _, y_tune, _ = train_test_split(
                    X_train, y_train, train_size=MAX_TUNE_SAMPLES, random_state=42
                )
            else:
                X_tune, y_tune = X_train, y_train

            cv_strategy = KFold(n_splits=5, shuffle=True, random_state=42)
            scoring = "r2"
            direction = "maximize"

        if not isinstance(X_tune, pd.DataFrame):
            raise ValueError(
                f"X_tune must be a pandas DataFrame for ColumnTransformer string column selectors, got {type(X_tune)}."
            )

        # ── Objective ──────────────────────────────
        def objective(trial):
            try:
                if is_classification:
                    model = _build_classifier(trial, model_name, weight)
                else:
                    model = _build_regressor(trial, model_name)

                pipeline = Pipeline(
                    steps=[("preprocessor", preprocessor), ("model", model)]
                )

                scores = cross_val_score(
                    pipeline, X_tune, y_tune, cv=cv_strategy, scoring=scoring, n_jobs=1
                )
                return scores.mean()
            except Exception as e:
                print(
                    f"[tune_selected_model.objective] ERROR in trial: {type(e).__name__}: {str(e)}"
                )
                raise optuna.TrialPruned()

        # ── Run Study ──────────────────────────────
        study = optuna.create_study(
            direction=direction,
            sampler=optuna.samplers.TPESampler(seed=42),
            pruner=optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=3),
        )
        study.optimize(objective, timeout=timeout, n_jobs=1, show_progress_bar=True)

        # print(f"\n  Best CV score ({scoring}): {study.best_value:.4f}")
        # print(f"  Best params: {study.best_params}")

        # ── Build final pipeline with best params ──
        best_params = study.best_params.copy()

        if is_classification:
            best_pipeline = _build_best_classifier(
                model_name, best_params, preprocessor, weight
            )
        else:
            best_pipeline = _build_best_regressor(model_name, best_params, preprocessor)

        return best_pipeline

    except Exception as e:
        print(f"[tune_selected_model] FATAL ERROR: {type(e).__name__}: {str(e)}")
        raise
