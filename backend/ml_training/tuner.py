import optuna
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from .models import _build_best_regressor, _build_best_classifier

optuna.logging.set_verbosity(optuna.logging.WARNING)

# ─────────────────────────────────────────────
# SHARED OBJECTIVE BUILDER
# ─────────────────────────────────────────────
def _get_classifier_model(trial, weight):
    model_name = trial.suggest_categorical("model_name", [
        "Logistic Regression", "Ridge Classifier",
        "Random Forest", "XGBoost", "LightGBM", "KNN"
    ])

    if model_name == "Logistic Regression":
        from sklearn.linear_model import LogisticRegression
        model = LogisticRegression(
            C             = trial.suggest_float("lr_C", 0.01, 10.0, log=True),
            solver        = trial.suggest_categorical("lr_solver", ["lbfgs", "saga"]),
            class_weight  = weight,
            max_iter      = 1000,
            random_state  = 42,
        )

    elif model_name == "Ridge Classifier":
        from sklearn.linear_model import RidgeClassifier
        model = RidgeClassifier(
            alpha = trial.suggest_float("rc_alpha", 0.01, 10.0, log=True),
        )

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(
            n_estimators      = trial.suggest_int("rf_n_estimators", 50, 300),
            max_depth         = trial.suggest_int("rf_max_depth", 3, 15),
            min_samples_split = trial.suggest_int("rf_min_samples_split", 2, 10),
            min_samples_leaf  = trial.suggest_int("rf_min_samples_leaf", 1, 5),
            max_features      = trial.suggest_categorical("rf_max_features", ["sqrt", "log2"]),
            class_weight      = weight,
            random_state      = 42,
            n_jobs            = 1,   # ← avoid CPU conflict with optuna
        )

    elif model_name == "XGBoost":
        from xgboost import XGBClassifier
        model = XGBClassifier(
            n_estimators     = trial.suggest_int("xgb_n_estimators", 100, 400),
            max_depth        = trial.suggest_int("xgb_max_depth", 3, 8),
            learning_rate    = trial.suggest_float("xgb_learning_rate", 0.01, 0.3, log=True),
            subsample        = trial.suggest_float("xgb_subsample", 0.6, 1.0),
            colsample_bytree = trial.suggest_float("xgb_colsample_bytree", 0.6, 1.0),
            gamma            = trial.suggest_float("xgb_gamma", 0, 5),
            random_state     = 42,
            eval_metric      = "logloss",
            verbosity        = 0,
            n_jobs           = 1,   # ← avoid CPU conflict
        )

    elif model_name == "LightGBM":
        from lightgbm import LGBMClassifier
        model = LGBMClassifier(
            n_estimators     = trial.suggest_int("lgb_n_estimators", 100, 400),
            max_depth        = trial.suggest_int("lgb_max_depth", 3, 10),
            learning_rate    = trial.suggest_float("lgb_learning_rate", 0.01, 0.3, log=True),
            num_leaves       = trial.suggest_int("lgb_num_leaves", 20, 100),
            subsample        = trial.suggest_float("lgb_subsample", 0.6, 1.0),
            colsample_bytree = trial.suggest_float("lgb_colsample_bytree", 0.6, 1.0),
            class_weight     = weight,
            random_state     = 42,
            verbosity        = -1,
            n_jobs           = 1,
        )

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsClassifier
        model = KNeighborsClassifier(
            n_neighbors = trial.suggest_int("knn_n_neighbors", 3, 15),
            weights     = trial.suggest_categorical("knn_weights", ["uniform", "distance"]),
            metric      = trial.suggest_categorical("knn_metric", ["euclidean", "manhattan"]),
            n_jobs      = 1,
        )

    return model


def _get_regressor_model(trial):
    model_name = trial.suggest_categorical("model_name", [
        "ElasticNet", "Random Forest", "XGBoost", "LightGBM", "KNN"
    ])

    if model_name == "ElasticNet":
        from sklearn.linear_model import ElasticNet
        model = ElasticNet(
            alpha    = trial.suggest_float("en_alpha", 0.0001, 10.0, log=True),
            l1_ratio = trial.suggest_float("en_l1_ratio", 0.0, 1.0),
            max_iter = 2000,
        )

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(
            n_estimators      = trial.suggest_int("rf_n_estimators", 50, 300),
            max_depth         = trial.suggest_int("rf_max_depth", 3, 15),
            min_samples_split = trial.suggest_int("rf_min_samples_split", 2, 10),
            min_samples_leaf  = trial.suggest_int("rf_min_samples_leaf", 1, 5),
            max_features      = trial.suggest_categorical("rf_max_features", ["sqrt", "log2"]),
            random_state      = 42,
            n_jobs            = 1,
        )

    elif model_name == "XGBoost":
        from xgboost import XGBRegressor
        model = XGBRegressor(
            n_estimators     = trial.suggest_int("xgb_n_estimators", 100, 500),
            max_depth        = trial.suggest_int("xgb_max_depth", 3, 8),
            learning_rate    = trial.suggest_float("xgb_learning_rate", 0.01, 0.3, log=True),
            subsample        = trial.suggest_float("xgb_subsample", 0.6, 1.0),
            colsample_bytree = trial.suggest_float("xgb_colsample_bytree", 0.6, 1.0),
            gamma            = trial.suggest_float("xgb_gamma", 0, 5),
            random_state     = 42,
            verbosity        = 0,
            n_jobs           = 1,
        )

    elif model_name == "LightGBM":
        from lightgbm import LGBMRegressor
        model = LGBMRegressor(
            n_estimators     = trial.suggest_int("lgb_n_estimators", 100, 500),
            max_depth        = trial.suggest_int("lgb_max_depth", 3, 10),
            learning_rate    = trial.suggest_float("lgb_learning_rate", 0.01, 0.3, log=True),
            num_leaves       = trial.suggest_int("lgb_num_leaves", 20, 100),
            subsample        = trial.suggest_float("lgb_subsample", 0.6, 1.0),
            colsample_bytree = trial.suggest_float("lgb_colsample_bytree", 0.6, 1.0),
            random_state     = 42,
            verbosity        = -1,
            n_jobs           = 1,
        )

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsRegressor
        model = KNeighborsRegressor(
            n_neighbors = trial.suggest_int("knn_n_neighbors", 3, 15),
            weights     = trial.suggest_categorical("knn_weights", ["uniform", "distance"]),
            metric      = trial.suggest_categorical("knn_metric", ["euclidean", "manhattan"]),
            n_jobs      = 1,
        )

    return model

# ─────────────────────────────────────────────
# CLASSIFICATION TUNER
# ─────────────────────────────────────────────
def tune_classifier(preprocessor, X_train, y_train,
                    use_balanced=False, timeout=600):
    weight = "balanced" if use_balanced else None

    # Sample for large datasets
    if len(X_train) > 8000:
        X_tune, _, y_tune, _ = train_test_split(
            X_train, y_train,
            train_size=8000, random_state=42, stratify=y_train
        )
        print(f"  Sampling 8,000 rows for faster tuning search")
    else:
        X_tune, y_tune = X_train, y_train

    def objective(trial):
        model = _get_classifier_model(trial, weight)
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ])
        try:
            scores = cross_val_score(
                pipeline, X_tune, y_tune,
                cv=2, scoring="f1_weighted", n_jobs=1  
            )
            return scores.mean()
        except Exception:
            raise optuna.TrialPruned()

    study = optuna.create_study(
        direction="maximize",
        sampler=optuna.samplers.TPESampler(seed=42)  # deterministic
    )
    study.optimize(objective, timeout=timeout, n_jobs=1, show_progress_bar=True)

    best_model_name = study.best_params["model_name"]

    prefix_map = {
        "Logistic Regression": "lr_",
        "Ridge Classifier":    "rc_",
        "Random Forest":       "rf_",
        "XGBoost":             "xgb_",
        "LightGBM":            "lgb_",
        "KNN":                 "knn_",
    }
    prefix = prefix_map[best_model_name]
    best_params = {
        k[len(prefix):]: v
        for k, v in study.best_params.items()
        if k.startswith(prefix)
    }

    best_pipeline = _build_best_classifier(
        best_model_name, best_params, preprocessor, weight
    )
    return best_pipeline, best_model_name


# ─────────────────────────────────────────────
# REGRESSION TUNER
# ─────────────────────────────────────────────
def tune_regressor(preprocessor, X_train, y_train, timeout=600):

    if len(X_train) > 8000:
        X_tune, _, y_tune, _ = train_test_split(
            X_train, y_train, train_size=8000, random_state=42
        )
        print(f"  Sampling 8,000 rows for faster tuning search")
    else:
        X_tune, y_tune = X_train, y_train

    def objective(trial):
        model = _get_regressor_model(trial)
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ])
        try:
            scores = cross_val_score(
                pipeline, X_tune, y_tune,
                cv=2, scoring="r2", n_jobs=1
            )
            return scores.mean()
        except Exception:
            raise optuna.TrialPruned()

    study = optuna.create_study(
        direction="maximize",
        sampler=optuna.samplers.TPESampler(seed=42)
    )
    study.optimize(objective, timeout=timeout, n_jobs=1, show_progress_bar=True)

    best_model_name = study.best_params["model_name"]

    prefix_map = {
        "ElasticNet":    "en_",
        "Random Forest": "rf_",
        "XGBoost":       "xgb_",
        "LightGBM":      "lgb_",
        "KNN":           "knn_",
    }
    prefix = prefix_map[best_model_name]
    best_params = {
        k[len(prefix):]: v
        for k, v in study.best_params.items()
        if k.startswith(prefix)
    }

    best_pipeline = _build_best_regressor(
        best_model_name, best_params, preprocessor
    )
    return best_pipeline, best_model_name


# ─────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────
def run_tuning(preprocessor, X_train, y_train,
               is_classification, use_balanced=False, timeout=600):

    # print("\n" + "="*50)
    # print("  🚀 FULL AUTO-ML SEARCH INITIATED")
    # print(f"  Type      : {'Classification' if is_classification else 'Regression'}")
    # print(f"  Train size: {len(X_train)} rows")
    # print(f"  Time limit: {timeout//60} min")
    # print("="*50)

    if is_classification:
        return tune_classifier(preprocessor, X_train, y_train, use_balanced, timeout)
    else:
        return tune_regressor(preprocessor, X_train, y_train, timeout)