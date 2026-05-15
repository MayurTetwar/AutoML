# AutoML Backend Project

This project is the backend API for an AutoML system built with FastAPI, Modal, and Supabase.

## Purpose

- Provide user authentication and authorization
- Accept dataset uploads and start AutoML training jobs
- Store model metadata and trained models
- Serve predictions from trained models

## Project structure

- `backend/`
  - `main.py` — FastAPI application and route registration
  - `modal_app.py` — Modal deployment configuration and remote training runner
  - `api/` — API routes and dependencies
  - `ml_training/` — training, preprocessing, and model building logic
  - `storage/` — Supabase client, database access, cache, and model storage helpers
- `requirements.txt` — Python dependencies
- `API_DOCS.md` — public API reference for endpoint consumers

## Get started

1. Activate the virtual environment:
   ```powershell
   .\env\Scripts\Activate.ps1
   ```

2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

3. Set required Supabase environment variables:
   ```powershell
   setx SUPABASE_URL "https://<your-supabase-url>"
   setx SUPABASE_ANON_KEY "<your-anon-key>"
   setx SUPABASE_SERVICE_ROLE_KEY "<your-service-role-key>"
   ```

4. Run the backend locally:
   ```powershell
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Verify the API is running:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## Deployment

The backend can be deployed using Modal with `backend/modal_app.py`.

### Local Modal testing

```powershell
modal serve backend/modal_app.py
```

### Deploy to Modal

```powershell
modal deploy backend/modal_app.py
```

### Modal secrets

Create secrets once before deployment:

```powershell
modal secret create automl-secrets \
  SUPABASE_URL=<your-url> \
  SUPABASE_ANON_KEY=<your-anon-key> \
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Contributing

- Keep backend logic inside `backend/api/`, `backend/ml_training/`, and `backend/storage/`
- Document new API endpoints in `API_DOCS.md`
- Keep auth and permission logic consistent
- Use clear commit messages and feature branches
- Do not store secrets in source control

## Notes

- The deployed backend URL is:
  `https://mayurtetwar123--automl-api-fastapi-app.modal.run`
- Use `API_DOCS.md` for details on available endpoints and example requests.
- If you add frontend support later, this README should be updated to describe the full stack.
