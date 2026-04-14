import pandas as pd
from ML.trainer import start_model_building

if __name__ == "__main__":
    df = pd.read_csv("dataset/SeoulBikeData.csv",encoding='unicode_escape')
    start_model_building(df, target_col="Rented Bike Count", problemTypeB=False, modelName="XGBoost") 