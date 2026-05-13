# AutoML Project - Complete Summary

## 🎯 Project Overview

**AutoML** is a FastAPI-based Machine Learning automation platform that automates the entire ML pipeline for both **classification and regression** tasks. It intelligently handles data preprocessing, model selection, hyperparameter tuning, and model persistence with cloud storage integration.

---

## 📊 Core Purpose

The project eliminates manual ML pipeline engineering by:
1. **Automating data analysis** - Detects column types, missing values, and data characteristics
2. **Intelligent preprocessing** - Applies appropriate transformations (scaling, encoding, imputation)
3. **Model selection** - Trains multiple models and selects the best performer
4. **Hyperparameter tuning** - Uses Optuna for efficient hyperparameter optimization
5. **Model persistence** - Stores trained models in Supabase Storage with metadata in PostgreSQL

---

## 📁 Project Structure

```
AutoML/
├── backend/
│   ├── main.py                          # FastAPI application entry point
│   │
│   ├── api/
│   │   └── routes/
│   │       ├── train.py                 # POST /train endpoint (model training)
│   │       └── models.py                # GET/POST/DELETE /models endpoints (model management)
│   │
│   ├── ml_training/                     # ML Pipeline Core Logic
│   │   ├── __init__.py
│   │   ├── analyzer.py                  # Column type detection & data analysis
│   │   ├── models.py                    # Model builder functions for each algorithm
│   │   ├── pipeline_builder.py          # Constructs sklearn Pipeline with preprocessing
│   │   ├── preprocessor.py              # Data preprocessing decisions
│   │   ├── trainer.py                   # Main training orchestration
│   │   └── tuner.py                     # Optuna-based hyperparameter tuning
│   │
│   └── model_storage/                   # Persistence Layer
│       ├── database.py                  # Supabase PostgreSQL operations
│       ├── model_cache.py               # In-memory LRU cache for models
│       ├── storage.py                   # Supabase Storage (S3-like) operations
│       └── supabase_client.py           # Supabase client initialization
│
├── env/                                 # Python virtual environment
│   ├── pyvenv.cfg
│   ├── Lib/site-packages/               # All installed dependencies
│   ├── Include/
│   └── Scripts/
│
├── requirements.txt                     # Python dependencies
├── imp.txt                              # Important setup instructions (Supabase RLS)
└── PROJECT_SUMMARY.md                   # This file
```

---

## 🔧 Technology Stack

### Core ML Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| pandas | 2.2.0 | Data manipulation & analysis |
| numpy | 1.26.4 | Numerical computing |
| scikit-learn | 1.4.0 | ML algorithms & preprocessing |
| xgboost | 2.0.3 | Gradient boosting for classification/regression |
| lightgbm | 4.3.0 | Gradient boosting (alternative to XGBoost) |
| optuna | 3.5.0 | Hyperparameter optimization framework |
| joblib | 1.3.2 | Pipeline serialization (now uses Supabase) |
| category-encoders | 2.6.3 | Advanced encoding for categorical variables |

### API & Web Framework
| Library | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.110.0 | High-performance async web framework |
| uvicorn | 0.27.0 | ASGI server to run FastAPI |
| pydantic | 2.13.2 | Data validation & settings |
| python-multipart | 0.0.9 | Multipart form data handling (for file uploads) |

### Cloud & Storage
| Library | Version | Purpose |
|---------|---------|---------|
| supabase | 2.29.0 | PostgreSQL + Cloud Storage client |
| python-dotenv | 1.2.2 | Environment variable management |
| uuid6 | 2025.0.1 | UUID generation for unique model IDs |

---

## 🚀 API Endpoints

### Health Check
```
GET /
Response: {"status": "AutoML API is running ✅"}
```

### Training Endpoint
```
POST /train
```
**Form Parameters:**
- `file`: CSV or Excel dataset (multipart/form-data)
- `target_column`: Name of the target column (string)
- `problem_type_classification`: True for classification, False for regression (boolean)
- `timeout`: Maximum tuning time in seconds, minimum 60 (integer)
- `model_name`: Specific model to train (string)

**Supported Models:**
- **Classification**: Logistic Regression, Ridge Classifier, Random Forest, XGBoost, LightGBM, KNN
- **Regression**: ElasticNet, Random Forest, XGBoost, LightGBM, KNN

**Response:**
```json
{
  "model_id": "unique-uuid-identifier",
  "model_name": "XGBoost",
  "problem_type": "classification",
  "score": 0.9456,
  "metrics": {
    "accuracy": 0.9456,
    "f1_weighted": 0.9432
  },
  "dataset_stats": {
    "rows": 1500,
    "cols": 12
  },
  "training_time_seconds": 125.43,
  "tuning_timeout": 300
}
```

### Model Management Endpoints
```
GET /models               # List all trained models
GET /models/{model_id}    # Get specific model details
POST /models/predict      # Make predictions with a model
DELETE /models/{model_id} # Delete a trained model
```

---

## 🧠 Core ML Pipeline Workflow

### 1. **Data Analysis** (`analyzer.py`)
Analyzes each column and returns:
```python
{
    "column_name": {
        "type": "NUMERICAL|CATEGORICAL_LOW|CATEGORICAL_HIGH|BINARY|ORDINAL|DATETIME|BOOLEAN|ID_COLUMN",
        "missing_pct": 0.5,
        "variance": 123.45,  # For numerical
        "skewness": 0.234    # For numerical
    },
    "target_imbalance": {
        "is_imbalanced": True,
        "ratio": 3.5
    }
}
```

### 2. **Data Preprocessing** (`preprocessor.py`)
Decides which transformations to apply per column:
- **Numerical columns**: SimpleImputer (median) → StandardScaler
- **Numerical with skew**: SimpleImputer (median) → PowerTransformer (Yeo-Johnson)
- **Categorical (low cardinality)**: SimpleImputer (mode) → OneHotEncoder
- **Categorical (high cardinality)**: SimpleImputer (mode) → TargetEncoder
- **Binary columns**: SimpleImputer (mode)
- **Boolean columns**: Convert to integer (0/1)
- **Datetime columns**: Extract year feature
- **ID columns**: Automatically dropped

### 3. **Pipeline Construction** (`pipeline_builder.py`)
Builds an sklearn `Pipeline` with:
```
Input Data
    ↓
ColumnTransformer (applies transformations per column type)
    ↓
Preprocessed Features (consistent shape & scale)
```

### 4. **Model Tuning** (`tuner.py`)
Uses **Optuna** to optimize hyperparameters:
- **Classification models**: Optimize C, alpha, n_estimators, max_depth, learning_rate, etc.
- **Regression models**: Similar hyperparameters tuned for regression
- **Timeout control**: User specifies max tuning time (minimum 60 seconds)
- **Evaluation metric**: Accuracy (classification) or R² (regression)
- **Cross-validation**: StratifiedKFold (classification) or KFold (regression)

### 5. **Model Training & Evaluation** (`trainer.py`)
```
Train/Validation Split (80/20)
    ↓
Train on training set
    ↓
Evaluate on validation set
    ↓
Calculate metrics (accuracy, F1, R², MAE, RMSE)
    ↓
Save model + metadata to Supabase
```

### 6. **Model Persistence** (`model_storage/`)
- **Database**: PostgreSQL (Supabase) stores metadata (model_id, performance, dataset info)
- **Storage**: Supabase Storage (S3-like) stores pickled model files
- **Cache**: In-memory LRU cache to avoid repeated downloads
- **User isolation**: Row-Level Security (RLS) ensures users only see their own models

---

## 📊 Data Requirements

**Minimum Dataset:**
- At least 100 rows
- CSV (.csv) or Excel (.xlsx, .xls) format
- Target column must exist in dataset

**Supported Data Types:**
- Numerical (int, float)
- Categorical (string, object)
- Boolean
- Datetime (auto-detected)
- Binary (0/1)

---

## 🔐 Database Schema (Supabase PostgreSQL)

### `models` Table
```sql
CREATE TABLE models (
    model_id UUID PRIMARY KEY,           -- Unique identifier
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- User ownership
    file_name TEXT,                      -- Original dataset filename
    model_name TEXT,                     -- Algorithm name (e.g., "XGBoost")
    problem_type TEXT,                   -- "classification" or "regression"
    target_column TEXT,                  -- Target column name
    score FLOAT,                         -- Primary metric (accuracy or R²)
    metrics JSONB,                       -- Full metrics (F1, MAE, RMSE, etc.)
    dataset_rows INT,                    -- Number of training samples
    dataset_cols INT,                    -- Number of features
    storage_path TEXT,                   -- Path in Supabase Storage
    created_at TIMESTAMP DEFAULT NOW()   -- Creation timestamp
);
```

### Row-Level Security Policies
```sql
-- Users only see their own models (SELECT)
CREATE POLICY "user_sees_own_models" ON models FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own models (INSERT)
CREATE POLICY "user_inserts_own_models" ON models FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own models (DELETE)
CREATE POLICY "user_deletes_own_models" ON models FOR DELETE USING (auth.uid() = user_id);
```

---

## ⚙️ Setup Instructions

### 1. Create Virtual Environment
```bash
python -m venv env
env\Scripts\activate  # Windows
# OR
source env/bin/activate  # macOS/Linux
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Supabase
Create a `.env` file in the project root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=models
```

### 4. Set Up Database (Supabase SQL Editor)
Execute all SQL statements from `imp.txt` in Supabase Dashboard

### 5. Run API Server
```bash
uvicorn backend.main:app --reload
```
API available at: `http://localhost:8000`
Docs: `http://localhost:8000/docs`

---

## 💾 Model Training Workflow Example

```python
# User uploads dataset: bike_rentals.csv
# Target: "Rented Bike Count"
# Problem: Regression
# Model: LightGBM

POST /train
├─ Receive CSV file
├─ Validate data (min 100 rows, target exists)
├─ Analyze columns (numerical, categorical, datetime)
├─ Decide preprocessing (scale, encode, impute)
├─ Build preprocessing pipeline
├─ Split data (80% train, 20% validation)
├─ Tune LightGBM hyperparameters with Optuna
├─ Train final model on full training set
├─ Evaluate metrics on validation set:
│  ├─ R² Score: 0.8945
│  ├─ MAE: 125.34 bikes
│  └─ RMSE: 245.67 bikes
├─ Serialize model to pickle
├─ Upload to Supabase Storage
├─ Save metadata to PostgreSQL
└─ Return model_id and metrics to user
```

---

## 🎓 Key Features

### ✅ Automated Features
- Intelligent column type detection (numerical, categorical, datetime, binary, etc.)
- Automatic missing value handling (imputation strategies)
- Smart scaling and encoding per column type
- Hyperparameter tuning with timeout control
- Automatic imbalance detection (classification)
- Model versioning with unique UUIDs
- In-memory caching for performance

### ✅ Supported Algorithms
- **Classification**: 6 models (Logistic Regression, Ridge, RF, XGBoost, LightGBM, KNN)
- **Regression**: 5 models (ElasticNet, RF, XGBoost, LightGBM, KNN)

### ✅ Cloud Integration
- Serverless PostgreSQL via Supabase
- Cloud file storage (S3-like)
- User authentication & Row-Level Security
- Scalable architecture

---

## 📝 Important Files & Their Roles

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app initialization, router inclusion |
| `train.py` | Training endpoint, file validation, orchestration |
| `models.py` | Model listing, retrieval, prediction endpoints |
| `analyzer.py` | Column type detection, data profiling |
| `preprocessor.py` | Preprocessing strategy decisions |
| `pipeline_builder.py` | Sklearn pipeline construction |
| `models.py` (ml_training) | Model instantiation with tuned hyperparameters |
| `trainer.py` | Main orchestration, evaluation, persistence |
| `tuner.py` | Optuna-based hyperparameter optimization |
| `database.py` | Supabase PostgreSQL CRUD operations |
| `storage.py` | Model file upload/download from Supabase |
| `model_cache.py` | In-memory LRU cache for models |
| `supabase_client.py` | Supabase client initialization |

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    API REQUEST: /train                          │
│  (CSV File + Target + Problem Type + Timeout + Model Name)     │
└──────────────────────────────┬──────────────────────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │   File Validation    │
                    │ (Format, Size, Rows) │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Column Analysis     │
                    │ (Type Detection)     │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Preprocessing Plan  │
                    │ (Scaling, Encoding)  │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Build ML Pipeline   │
                    │ (ColumnTransformer)  │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Train/Val Split     │
                    │ (80/20)              │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Optuna Tuning       │
                    │ (Hyperparameters)    │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Train Model         │
                    │ (Best Hyperparams)   │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Evaluate Metrics    │
                    │ (Accuracy/R²/F1/MAE) │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  Persist Model       │
                    │ (Supabase Storage)   │
                    │ (PostgreSQL Metadata)│
                    └──────────┬───────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│           API RESPONSE: model_id + metrics                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps for Development

1. **Authentication**: Integrate user login (Firebase, Auth0, or Supabase Auth)
2. **Deployment**: Deploy to Azure, AWS, or Heroku
3. **Frontend**: Build React/Vue interface
4. **Monitoring**: Add logging, error tracking (Sentry)
5. **Advanced Features**:
   - Ensemble methods
   - Feature importance visualization
   - Cross-validation strategies
   - Custom preprocessing rules
   - Model comparison dashboard

---

## 📞 Environment & Execution

**Running the API:**
```bash
cd e:\Mayur\Projects\AutoML
env\Scripts\activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Testing Endpoint:**
```bash
curl -X POST "http://localhost:8000/train" \
  -F "file=@dataset.csv" \
  -F "target_column=Rented_Bike_Count" \
  -F "problem_type_classification=false" \
  -F "timeout=300" \
  -F "model_name=LightGBM"
```

---

## ✨ Summary

This is a **production-ready AutoML platform** that:
- ✅ Handles end-to-end ML pipeline automation
- ✅ Supports both classification and regression
- ✅ Integrates cloud storage (Supabase)
- ✅ Provides REST API for easy integration
- ✅ Implements user isolation with RLS
- ✅ Uses industry-standard ML libraries
- ✅ Optimizes hyperparameters intelligently
- ✅ Caches models for performance

The architecture is modular, scalable, and ready for extension with additional features like ensemble methods, advanced visualization, or custom preprocessing logic.
