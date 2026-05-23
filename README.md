<div align="center">
  <h1>🚀 AutoML SaaS Platform</h1>
  <p><strong>A no-code Machine Learning platform that goes from raw dataset to production-ready REST API in minutes.</strong></p>
</div>

---

## 📖 Overview

This project is a complete full-stack SaaS application that allows users to upload datasets (CSV/Excel) and train machine learning models automatically. It eliminates the need for boilerplate ML code by leveraging **Optuna** for automatic hyperparameter tuning and model selection.

Once a model finishes training, it is instantly deployed and accessible via a private, authenticated REST API endpoint, ready to be integrated into any frontend or external application.

## ✨ Key Features

- **No-Code Training:** Automatically trains and evaluates Classification or Regression models (`XGBoost`, `LightGBM`, `Random Forest`, etc.).
- **Auto & Manual Modes:** Choose exactly which model to train, or let Optuna's Auto Mode find the best algorithm and hyperparameters for your dataset.
- **Instant Predictions:** Every trained model receives a dedicated REST API endpoint for real-time inference.
- **Live Dashboard:** Real-time UI updates to monitor pending, running, and completed training jobs.
- **Secure Authentication:** JWT-based user authentication and row-level security powered by Supabase.
- **Developer API Keys:** Generate permanent API keys to integrate your models into external apps or scripts without requiring user login.

## 🛠️ Technology Stack

**Frontend:**
- React, Vite, React Router
- Vanilla CSS + Tailwind CSS v4 (Custom UI design system)

**Backend:**
- Python, FastAPI
- Scikit-Learn, XGBoost, LightGBM, Optuna
- Modal (Serverless cloud compute for heavy ML workloads)

**Database & Auth:**
- Supabase (PostgreSQL, GoTrue Auth)

---

## 💻 How to Run Locally

If you just want to run the UI, the backend is currently deployed live on Modal. You only need to start the frontend!

### 1. Start the Frontend (UI)

1. Open your terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` folder:
   ```env
   # Points to the live cloud backend by default
   VITE_API_BASE_URL=https://mayurtetwar123--automl-api-fastapi-app.modal.run
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

---

### 2. (Optional) Run the Backend Locally

If you want to modify the Python API or ML training logic, you can run the backend locally instead of using the live Modal endpoint.

1. Activate the Python virtual environment and install dependencies:
   ```bash
   .\env\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the root directory with your Supabase credentials:
   ```env
   SUPABASE_URL="https://<your-supabase-url>"
   SUPABASE_KEY="<your-anon-key>"
   SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
   ```

3. Start the FastAPI server:
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The API will be available at `http://localhost:8000`. You can view the Swagger UI docs at `http://localhost:8000/docs`.*

*(Note: If running the backend locally, remember to change your `frontend/.env` to `VITE_API_BASE_URL=http://localhost:8000`)*

---

## ☁️ Deploying the Backend to Modal

This backend is designed to run serverlessly on [Modal](https://modal.com/) to handle intensive ML compute efficiently.

1. Create a secret in your Modal dashboard or via CLI to hold your database credentials:
   ```bash
   modal secret create automl-secrets SUPABASE_URL=<url> SUPABASE_ANON_KEY=<key> SUPABASE_SERVICE_ROLE_KEY=<service-key>
   ```

2. Deploy the application to Modal:
   ```bash
   modal deploy backend/modal_app.py
   ```

---

## 📡 API Reference

Here are the primary REST endpoints exposed by the backend:

**Authentication & API Keys:**
- `POST /auth/signup` — Register a new user
- `POST /auth/login` — Login and receive JWT token
- `POST /api-keys/` — Generate a new permanent API key
- `GET /api-keys/` — List all active API keys
- `DELETE /api-keys/{key_id}` — Revoke an API key

**Training:**
- `POST /train/` — Start a manual training job
- `POST /train/auto` — Start an automated (Optuna) training job
- `GET /train/jobs` — View history of your training jobs
- `GET /train/status/{job_id}` — Poll status of an active job

**Models & Predictions:**
- `GET /models/` — List all your successfully trained models
- `GET /models/{model_id}` — Get metadata, accuracy scores, and hyperparameters
- `GET /models/{model_id}/features` — View the required JSON schema for predictions
- `POST /models/{model_id}/predict` — Send JSON payload to get ML predictions
