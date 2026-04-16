from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, FunctionTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import TargetEncoder
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
import pandas as pd

def bool_to_int(X):
    return X.astype(int)

def build_pipeline(preprocess_plan):
    numerical_cols = []
    numerical_log_cols = []
    categorical_low_cols = []
    categorical_high_cols = []
    binary_cols = []
    datetime_cols = []
    boolean_cols = []

    for col, steps in preprocess_plan.items():
        if 'bool_to_int' in steps:
            boolean_cols.append(col)
        elif 'log_transform' in steps:
            numerical_log_cols.append(col)
        elif 'standard_scale' in steps:
            numerical_cols.append(col)
        elif 'one_hot_encode' in steps:
            categorical_low_cols.append(col)
        elif 'target_encode' in steps:
            categorical_high_cols.append(col)
        elif 'binary' in steps:
            binary_cols.append(col)
        elif 'extract_year' in steps:
            datetime_cols.append(col)

    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    bool_transformer = FunctionTransformer(bool_to_int)

    log_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('log', FunctionTransformer(np.log1p)),
        ('scaler', StandardScaler())
    ])

    categorical_low_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    categorical_high_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', TargetEncoder(target_type='auto', smooth="auto"))
    ])

    binary_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent'))
    ])

    preprocessor = ColumnTransformer(transformers=[
        ('num', numerical_transformer, numerical_cols),
        ('num_log', log_transformer, numerical_log_cols),
        ('cat_low', categorical_low_transformer, categorical_low_cols),
        ('cat_high', categorical_high_transformer, categorical_high_cols),
        ('binary', binary_transformer, binary_cols),
        ('bool', bool_transformer, boolean_cols),
        ('datetime', DatetimeTransformer(), datetime_cols),
    ])

    return preprocessor

class DatetimeTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        result = pd.DataFrame()
        for col in X.columns:
            series = pd.to_datetime(X[col], dayfirst=True)
            result[f"{col}_year"]      = series.dt.year
            result[f"{col}_month"]     = series.dt.month
            result[f"{col}_dayofweek"] = series.dt.dayofweek
            result[f"{col}_day"]       = series.dt.day
        return result.values