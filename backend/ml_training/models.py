from sklearn.pipeline import Pipeline


def _build_best_regressor(model_name, params, preprocessor):
    """Build final pipeline with best params from Optuna."""
    try:
        if model_name == "ElasticNet":
            from sklearn.linear_model import ElasticNet

            model = ElasticNet(**params, max_iter=2000)

        elif model_name == "Random Forest":
            from sklearn.ensemble import RandomForestRegressor

            model = RandomForestRegressor(**params, random_state=42)

        elif model_name == "XGBoost":
            from xgboost import XGBRegressor

            model = XGBRegressor(**params, random_state=42, verbosity=0)

        elif model_name == "LightGBM":
            from lightgbm import LGBMRegressor

            model = LGBMRegressor(**params, random_state=42, verbosity=-1)

        elif model_name == "KNN":
            from sklearn.neighbors import KNeighborsRegressor

            model = KNeighborsRegressor(**params)

        return Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])
    except Exception as e:
        print(
            f"[_build_best_regressor] ERROR building {model_name}: {type(e).__name__}: {str(e)}"
        )
        raise


def _build_best_classifier(model_name, params, preprocessor, weight):
    """Build final pipeline with best params from Optuna."""
    try:
        if model_name == "Logistic Regression":
            from sklearn.linear_model import LogisticRegression

            model = LogisticRegression(**params, class_weight=weight, random_state=42)

        elif model_name == "Ridge Classifier":
            from sklearn.linear_model import RidgeClassifier

            model = RidgeClassifier(**params)

        elif model_name == "Random Forest":
            from sklearn.ensemble import RandomForestClassifier

            model = RandomForestClassifier(
                **params, class_weight=weight, random_state=42
            )

        elif model_name == "XGBoost":
            from xgboost import XGBClassifier

            model = XGBClassifier(**params, random_state=42, verbosity=0)

        elif model_name == "LightGBM":
            from lightgbm import LGBMClassifier

            model = LGBMClassifier(
                **params, class_weight=weight, random_state=42, verbosity=-1
            )

        elif model_name == "KNN":
            from sklearn.neighbors import KNeighborsClassifier

            model = KNeighborsClassifier(**params)

        return Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])
    except Exception as e:
        print(
            f"[_build_best_classifier] ERROR building {model_name}: {type(e).__name__}: {str(e)}"
        )
        raise
