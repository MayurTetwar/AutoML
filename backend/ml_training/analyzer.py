import pandas as pd

def analyze_columns(df, target_col, is_classification=False):
    report = {}

    try:
        if is_classification:
            try:
                counts = df[target_col].value_counts()
                imbalance_ratio = counts.max() / counts.min() if counts.min() > 0 else 0
                report['target_imbalance'] = {
                    'is_imbalanced': imbalance_ratio > 3.0,  # Threshold of 3:1
                    'ratio': imbalance_ratio
                }
            except Exception as e:
                print(f"[analyze_columns] ERROR analyzing target column '{target_col}': {type(e).__name__}: {str(e)}")
                raise

        for col in df.columns:
            try:
                if col == target_col:
                    continue
                info = {}

                if df[col].dtype == 'object':
                    try:
                        pd.to_datetime(df[col], dayfirst=True)
                        info['type'] = 'DATETIME'   # ← catches Date column correctly!
                    except:
                        unique_ratio = df[col].nunique() / len(df)
                        if unique_ratio > 0.9:
                            info['type'] = 'ID_COLUMN'
                        elif df[col].nunique() <= 10:
                            info['type'] = 'CATEGORICAL_LOW'
                        else:
                            info['type'] = 'CATEGORICAL_HIGH'
                elif df[col].dtype == 'bool':
                    info['type'] = 'BOOLEAN'
                elif df[col].dtype in ['int64', 'float64']:
                    if df[col].nunique() <= 2:
                        info['type'] = 'BINARY'
                    elif df[col].nunique() <= 10:
                        info['type'] = 'ORDINAL'
                    else:
                        info['type'] = 'NUMERICAL'
                elif 'datetime' in str(df[col].dtype):
                    info['type'] = 'DATETIME'
                else:
                    info['type'] = 'UNKNOWN'  # Fallback for unhandled dtypes

                info['missing_pct'] = df[col].isnull().mean() * 100
                if info.get('type') == 'NUMERICAL':
                    info['variance'] = df[col].var()
                    info['skewness'] = df[col].skew()

                report[col] = info

            except Exception as e:
                print(f"[analyze_columns] ERROR processing column '{col}': {type(e).__name__}: {str(e)}")
                raise

    except Exception as e:
        print(f"[analyze_columns] FATAL ERROR: {type(e).__name__}: {str(e)}")
        raise

    return report