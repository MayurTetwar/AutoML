from xgboost import XGBClassifier, XGBRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingRegressor

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