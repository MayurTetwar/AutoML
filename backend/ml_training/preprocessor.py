def auto_drop_columns(df, target_col, report):
    cols_to_drop = []
    reasons = {}

    for col, info in report.items():
        if col == target_col:
            continue

        # Rule 1 — ID columns (unique per row = useless)
        if info['type'] == 'ID_COLUMN':
            cols_to_drop.append(col)
            reasons[col] = "Looks like ID column (90%+ unique values)"

        # Rule 2 — Too much missing data
        elif info['missing_pct'] > 45:
            cols_to_drop.append(col)
            reasons[col] = f"Too many missing values ({info['missing_pct']:.0f}%)"

        # Rule 3 — Only one unique value (zero variance)
        elif df[col].nunique() <= 1:
            cols_to_drop.append(col)
            reasons[col] = "Only 1 unique value — no information"

    return cols_to_drop, reasons



def decide_preprocessing(df, report):
    preprocessing_plan = {}

    for col, info in report.items():

        if info['type'] == 'BOOLEAN':
            preprocessing_plan[col] = ['bool_to_int']  # False→0, True→1

        elif info['type'] == 'NUMERICAL':
            plan = ['impute_median']   # fill missing with median

            # Skewed data needs log transform
            if abs(info['skewness']) > 1.5:
                plan.append('log_transform')

            # Always scale numerical
            plan.append('standard_scale')

            preprocessing_plan[col] = plan

        elif info['type'] == 'CATEGORICAL_LOW':
            plan = ['impute_mode']     # fill missing with most common
            plan.append('one_hot_encode')
            preprocessing_plan[col] = plan

        elif info['type'] == 'CATEGORICAL_HIGH':
            plan = ['impute_mode']
            # Too many categories → use target encoding instead of one-hot
            plan.append('target_encode')
            preprocessing_plan[col] = plan

        elif info['type'] == 'BINARY':
            plan = ['impute_mode']
            # Already 0/1, just fill missing
            preprocessing_plan[col] = plan

        elif info['type'] == 'DATETIME':
            # Extract useful parts
            plan = ['extract_year', 'extract_month', 'extract_dayofweek']
            preprocessing_plan[col] = plan

        elif info['type'] == 'ORDINAL':
            plan = ['impute_median']
            plan.append('standard_scale')   # treat like numerical
            preprocessing_plan[col] = plan

    return preprocessing_plan