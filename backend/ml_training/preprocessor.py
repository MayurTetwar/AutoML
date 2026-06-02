import pandas as pd


def auto_drop_columns(df, target_col, report):
    cols_to_drop = []
    reasons = {}

    try:
        for col, info in report.items():
            try:
                if col == target_col:
                    continue

                # Skip entries that don't have 'type' (e.g., metadata like 'target_imbalance')
                if not isinstance(info, dict) or "type" not in info:
                    continue

                # Rule 1 — ID columns (unique per row = useless)
                if info["type"] == "ID_COLUMN":
                    cols_to_drop.append(col)
                    reasons[col] = "Looks like ID column (90%+ unique values)"

                # Rule 2 — Too much missing data
                elif info["missing_pct"] > 45:
                    cols_to_drop.append(col)
                    reasons[col] = (
                        f"Too many missing values ({info['missing_pct']:.0f}%)"
                    )

                # Rule 3 — Only one unique value (zero variance)
                elif df[col].nunique() <= 1:
                    cols_to_drop.append(col)
                    reasons[col] = "Only 1 unique value — no information"

            except Exception as e:
                print(
                    f"[auto_drop_columns] ERROR processing column '{col}': {type(e).__name__}: {str(e)}"
                )
                print(f"  Column info: {info}")
                raise

    except Exception as e:
        print(f"[auto_drop_columns] FATAL ERROR: {type(e).__name__}: {str(e)}")
        raise

    return cols_to_drop, reasons


def decide_preprocessing(df, report):
    preprocessing_plan = {}

    try:
        for col, info in report.items():
            try:
                if not isinstance(info, dict) or "type" not in info:
                    continue

                if info["type"] == "BOOLEAN":
                    preprocessing_plan[col] = ["bool_to_int"]  # False→0, True→1

                elif info["type"] == "NUMERICAL":
                    plan = ["impute_median"]  # fill missing with median

                    # Skewed data needs log transform
                    if abs(info["skewness"]) > 1.5:
                        plan.append("log_transform")

                    # Always scale numerical
                    plan.append("standard_scale")

                    preprocessing_plan[col] = plan

                elif info["type"] == "CATEGORICAL_LOW":
                    plan = ["impute_mode"]  # fill missing with most common
                    plan.append("one_hot_encode")
                    preprocessing_plan[col] = plan

                elif info["type"] == "CATEGORICAL_HIGH":
                    plan = ["impute_mode"]
                    # Too many categories → use target encoding instead of one-hot
                    plan.append("target_encode")
                    preprocessing_plan[col] = plan

                elif info["type"] == "BINARY":
                    plan = ["impute_mode"]
                    # Already 0/1, just fill missing
                    preprocessing_plan[col] = plan

                elif info["type"] == "DATETIME":
                    # Extract useful parts
                    plan = [
                        "extract_year",
                        "extract_month",
                        "extract_dayofweek",
                        "extract_is_weekend",
                    ]
                    preprocessing_plan[col] = plan

                elif info["type"] == "ORDINAL":
                    plan = ["impute_median"]
                    plan.append("standard_scale")  # treat like numerical
                    preprocessing_plan[col] = plan

                elif info["type"] == "UNKNOWN":
                    # Fallback: treat as numerical if possible
                    if pd.api.types.is_numeric_dtype(df[col]):
                        preprocessing_plan[col] = ["impute_median", "standard_scale"]
                    else:
                        preprocessing_plan[col] = [
                            "impute_mode",
                            "one_hot_encode",
                        ]  # treat as categorical

            except Exception as e:
                print(
                    f"[decide_preprocessing] ERROR processing column '{col}': {type(e).__name__}: {str(e)}"
                )
                print(f"  Column info: {info}")
                raise

    except Exception as e:
        print(f"[decide_preprocessing] FATAL ERROR: {type(e).__name__}: {str(e)}")
        raise

    return preprocessing_plan
