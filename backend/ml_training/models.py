from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, RidgeClassifier, ElasticNet
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import Pipeline

# ─────────────────────────────────────────────
# CLASSIFICATION MODELS
# ─────────────────────────────────────────────
def getModelB(selected_model_name, use_balanced=False):
    """
    Returns best-default classification model.
    These params are hand-tuned defaults — good for most datasets.
    """
    weight = "balanced" if use_balanced else None

    model_dictionary = {

        "Logistic Regression": LogisticRegression(
            C            = 1.0,       # regularization — 1.0 is safe default
            solver       = "saga",    # best for large datasets
            class_weight = weight,
            max_iter     = 1000,
            random_state = 42,
            n_jobs       = -1,
        ),

        "Ridge Classifier": RidgeClassifier(
            alpha = 1.0,              # regularization strength
        ),

        "Random Forest": RandomForestClassifier(
            n_estimators      = 200,  # enough trees, not too slow
            max_depth         = 10,   # prevents overfitting
            min_samples_split = 5,
            min_samples_leaf  = 2,
            max_features      = "sqrt",
            class_weight      = weight,
            random_state      = 42,
            n_jobs            = -1,
        ),

        "XGBoost": XGBClassifier(
            n_estimators      = 300,
            max_depth         = 5,
            learning_rate     = 0.05, # slow lr = better generalization
            subsample         = 0.8,
            colsample_bytree  = 0.8,
            gamma             = 0.1,
            eval_metric       = "logloss",
            random_state      = 42,
            verbosity         = 0,
            n_jobs            = -1,
        ),

        "LightGBM": LGBMClassifier(
            n_estimators      = 300,
            max_depth         = 6,
            learning_rate     = 0.05,
            num_leaves        = 50,   # key LightGBM param
            subsample         = 0.8,
            colsample_bytree  = 0.8,
            class_weight      = weight,
            random_state      = 42,
            verbosity         = -1,
            n_jobs            = -1,
        ),

        "KNN": KNeighborsClassifier(
            n_neighbors = 7,          # 7 > 5 default, more stable
            weights     = "distance", # closer points matter more
            metric      = "euclidean",
            n_jobs      = -1,
        ),
    }

    if selected_model_name not in model_dictionary:
        raise ValueError(
            f"Unknown model '{selected_model_name}'. "
            f"Choose from: {list(model_dictionary.keys())}"
        )
    
    return model_dictionary[selected_model_name]


# ─────────────────────────────────────────────
# REGRESSION MODELS
# ─────────────────────────────────────────────
def getModelR(selected_model_name):
    """
    Returns best-default regression model.
    """
    model_dictionary = {

        "ElasticNet": ElasticNet(
            alpha    = 0.1,           # light regularization
            l1_ratio = 0.5,           # 50/50 Lasso + Ridge mix
            max_iter = 2000,
        ),

        "Random Forest": RandomForestRegressor(
            n_estimators      = 200,
            max_depth         = 10,
            min_samples_split = 5,
            min_samples_leaf  = 2,
            max_features      = "sqrt",
            random_state      = 42,
            n_jobs            = -1,
        ),

        "XGBoost": XGBRegressor(
            n_estimators      = 400,
            max_depth         = 5,
            learning_rate     = 0.05,
            subsample         = 0.8,
            colsample_bytree  = 0.8,
            gamma             = 0.1,
            random_state      = 42,
            verbosity         = 0,
            n_jobs            = -1,
        ),

        "LightGBM": LGBMRegressor(
            n_estimators      = 400,
            max_depth         = 6,
            learning_rate     = 0.05,
            num_leaves        = 50,
            subsample         = 0.8,
            colsample_bytree  = 0.8,
            random_state      = 42,
            verbosity         = -1,
            n_jobs            = -1,
        ),

        "KNN": KNeighborsRegressor(
            n_neighbors = 7,
            weights     = "distance",
            metric      = "euclidean",
            n_jobs      = -1,
        ),
    }

    if selected_model_name not in model_dictionary:
        raise ValueError(
            f"Unknown model '{selected_model_name}'. "
            f"Choose from: {list(model_dictionary.keys())}"
        )

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