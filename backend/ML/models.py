from xgboost import XGBClassifier, XGBRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline

def getModelB(selected_model_name, use_balanced=False):
    weight = 'balanced' if use_balanced else None
    
    model_dictionary = {
        'XGBoost': XGBClassifier(n_estimators=100, early_stopping_rounds=10, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, class_weight=weight, random_state=42),
        'Logistic Regression': LogisticRegression(max_iter=1000, class_weight=weight, random_state=42)
    }
    return model_dictionary[selected_model_name]

def getModelR(selected_model_name):
    model_dictionary = {
        'XGBoost': XGBRegressor(n_estimators=500, early_stopping_rounds=20, learning_rate=0.05, max_depth=6, random_state=42),
        'Random Forest': RandomForestRegressor(random_state=42),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42)
    }
    return model_dictionary[selected_model_name]

def _build_best_regressor(model_name, params, preprocessor):
    """Build final pipeline with best params from Optuna."""

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

    return Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ])

def _build_best_classifier(model_name, params, preprocessor, weight):
    """Build final pipeline with best params from Optuna."""

    if model_name == "Logistic Regression":
        from sklearn.linear_model import LogisticRegression
        model = LogisticRegression(**params, class_weight=weight, random_state=42)

    elif model_name == "Ridge Classifier":
        from sklearn.linear_model import RidgeClassifier
        model = RidgeClassifier(**params)

    elif model_name == "Random Forest":
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(**params, class_weight=weight, random_state=42)

    elif model_name == "XGBoost":
        from xgboost import XGBClassifier
        model = XGBClassifier(**params, random_state=42, verbosity=0)

    elif model_name == "LightGBM":
        from lightgbm import LGBMClassifier
        model = LGBMClassifier(**params, class_weight=weight, random_state=42, verbosity=-1)

    elif model_name == "KNN":
        from sklearn.neighbors import KNeighborsClassifier
        model = KNeighborsClassifier(**params)

    return Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ])