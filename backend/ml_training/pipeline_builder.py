from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import (
    PowerTransformer,
    StandardScaler,
    OneHotEncoder,
    FunctionTransformer,
)
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import TargetEncoder
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
import pandas as pd


def bool_to_int(X):
    return X.astype(int)


def build_pipeline(preprocess_plan):
    try:
        numerical_cols = []
        numerical_log_cols = []
        categorical_low_cols = []
        categorical_high_cols = []
        binary_cols = []
        datetime_cols = []
        boolean_cols = []

        for col, steps in preprocess_plan.items():
            try:
                if "bool_to_int" in steps:
                    boolean_cols.append(col)
                elif "log_transform" in steps:
                    numerical_log_cols.append(col)
                elif "standard_scale" in steps:
                    numerical_cols.append(col)
                elif "one_hot_encode" in steps:
                    categorical_low_cols.append(col)
                elif "target_encode" in steps:
                    categorical_high_cols.append(col)
                elif (
                    "impute_mode" in steps
                    and "one_hot_encode" not in steps
                    and "target_encode" not in steps
                ):
                    binary_cols.append(col)
                elif "extract_year" in steps:
                    datetime_cols.append(col)
            except Exception as e:
                print(
                    f"[build_pipeline] ERROR processing column '{col}' plan: {type(e).__name__}: {str(e)}"
                )
                raise

        numerical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )

        bool_transformer = FunctionTransformer(bool_to_int)

        log_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("power", PowerTransformer(method="yeo-johnson")),
            ]
        )

        categorical_low_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                (
                    "encoder",
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ),
            ]
        )

        categorical_high_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", TargetEncoder(target_type="auto", smooth="auto")),
            ]
        )

        binary_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="most_frequent"))]
        )

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numerical_transformer, numerical_cols),
                ("num_log", log_transformer, numerical_log_cols),
                ("cat_low", categorical_low_transformer, categorical_low_cols),
                ("cat_high", categorical_high_transformer, categorical_high_cols),
                ("binary", binary_transformer, binary_cols),
                ("bool", bool_transformer, boolean_cols),
                ("datetime", DatetimeTransformer(), datetime_cols),
            ],
            sparse_threshold=0,
        )  # Ensure dense output

        return preprocessor

    except Exception as e:
        print(f"[build_pipeline] FATAL ERROR: {type(e).__name__}: {str(e)}")
        raise


class DatetimeTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        try:
            return self
        except Exception as e:
            print(f"[DatetimeTransformer.fit] ERROR: {type(e).__name__}: {str(e)}")
            raise

    def transform(self, X):
        try:
            result = pd.DataFrame()
            for col in X.columns:
                try:
                    series = pd.to_datetime(X[col], dayfirst=True)
                    result[f"{col}_year"] = series.dt.year
                    result[f"{col}_month"] = series.dt.month
                    result[f"{col}_dayofweek"] = series.dt.dayofweek
                    result[f"{col}_day"] = series.dt.day
                    result[f"{col}_is_weekend"] = (series.dt.dayofweek >= 5).astype(int)
                except Exception as e:
                    print(
                        f"[DatetimeTransformer.transform] ERROR processing column '{col}': {type(e).__name__}: {str(e)}"
                    )
                    raise
            return result.values
        except Exception as e:
            print(
                f"[DatetimeTransformer.transform] FATAL ERROR: {type(e).__name__}: {str(e)}"
            )
            raise
