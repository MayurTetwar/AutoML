# Main ML pipline for training and testing the model

# import joblib
# import pandas as pd
# import warnings
# warnings.filterwarnings("ignore")
# if __name__ == "__main__":
#     input_data = {
#         "Hour": 10,
#         "Temperature(°C)": 20.5,
#         "Humidity(%)": 60,
#         "Wind speed (m/s)": 1.5,
#         "Visibility (10m)": 2000,
#         "Dew point temperature(°C)": 10.0,
#         "Solar Radiation (MJ/m2)": 0.5,
#         "Rainfall(mm)": 0.0,
#         "Snowfall (cm)": 0.0,
#         "Seasons": "Winter",
#         "Holiday": "No Holiday",
#         "Functioning Day": "Yes",
#         "Date": "01/12/2017"
#     } 
#     input_df = pd.DataFrame([input_data])
#     pipeline = joblib.load("output_models/model.pkl")

#     prediction = pipeline.predict(input_df)
#     print(f"Predicted Rented Bike Count: {prediction[0]:.0f}") # 779

# ----------------------------------------------------------------------------------------------------

from fastapi import FastAPI
from api.routes.models import router as models_router
from api.routes.train import router as train_router

app = FastAPI(
    title="AutoML API",
    version="1.0.0"
)

app.include_router(models_router)
app.include_router(train_router)

@app.get("/")
async def root():
    return {"message": "AutoML API is running 🚀", "docs": "/docs"}