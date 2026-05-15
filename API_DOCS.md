# AutoML API Documentation

This document is for users who want to call the AutoML backend API directly.

## Base URL

Use your deployed backend URL:

- `https://mayurtetwar123--automl-api-fastapi-app.modal.run`

If you are developing locally, use:

- `http://localhost:8000`

### Swagger / OpenAPI UI

- Deployed: `https://mayurtetwar123--automl-api-fastapi-app.modal.run/docs`
- Local: `http://localhost:8000/docs`

## Authentication

### Signup

- Endpoint: `POST /auth/signup`
- Request body:
  ```json
  {
    "email": "user@example.com",
    "password": "yourPassword123"
  }
  ```
- Response:
  ```json
  {
    "message": "Account created successfully. You can now log in.",
    "access_token": "<jwt-token>",
    "token_type": "bearer",
    "user_id": "<user-id>"
  }
  ```

### Login

- Endpoint: `POST /auth/login`
- Request body:
  ```json
  {
    "email": "user@example.com",
    "password": "yourPassword123"
  }
  ```
- Response:
  ```json
  {
    "message": "Login successful.",
    "access_token": "<jwt-token>",
    "token_type": "bearer",
    "user_id": "<user-id>"
  }
  ```

### Using the access token

Include the token in every protected request header:

```http
Authorization: Bearer <access_token>
```

## Endpoints

### Training

#### Start training

- `POST /train/`
- Request type: `multipart/form-data`
- Headers:
  - `Authorization: Bearer <access_token>`
- Fields:
  - `file` - CSV or Excel file (`.csv`, `.xlsx`, `.xls`)
  - `target_column` - column name to predict
  - `problem_type_classification` - boolean (`true` for classification, `false` for regression)
  - `timeout` - timeout in seconds (minimum `60`)
  - `model_name` - model selection name

- Example response:
  ```json
  {
    "message": "Training started on Modal. Poll status endpoint to track progress.",
    "job_id": "<job-id>",
    "model_name": "Random Forest",
    "status": "pending",
    "track_url": "/train/status/<job-id>"
  }
  ```

#### Check training status

- `GET /train/status/{job_id}`
- Headers:
  - `Authorization: Bearer <access_token>`
- Response fields:
  - `job_id`
  - `status` - `pending`, `running`, `completed`, or `failed`
  - `model_name`
  - `created_at`
  - `updated_at`
  - `model_id` (when complete)
  - `error` (when failed)

#### List your training jobs

- `GET /train/jobs`
- Headers:
  - `Authorization: Bearer <access_token>`
- Response:
  ```json
  {
    "total": 2,
    "jobs": [ ... ]
  }
  ```

### Models

#### List models

- `GET /models/`
- Headers:
  - `Authorization: Bearer <access_token>`
- Response:
  ```json
  {
    "total": 1,
    "models": [
      {
        "model_id": "<model-id>",
        "model_name": "Random Forest",
        "type": "Regression",
        "score": 0.92,
        "created_at": "2026-05-15T12:34:56Z"
      }
    ]
  }
  ```

#### Get model metadata

- `GET /models/{model_id}`
- Headers:
  - `Authorization: Bearer <access_token>`
- Returns full model metadata.

#### Get model feature schema

- `GET /models/{model_id}/features`
- Headers:
  - `Authorization: Bearer <access_token>`
- Response example:
  ```json
  {
    "model_id": "<model-id>",
    "feature_count": 6,
    "features": {
      "temperature": "float",
      "humidity": "float",
      "season": "string"
    },
    "example_input": {
      "temperature": "?",
      "humidity": "?",
      "season": "?"
    }
  }
  ```

#### Predict with a model

- `POST /models/{model_id}/predict`
- Headers:
  - `Authorization: Bearer <access_token>`
- Request body: JSON object with all required features returned by `/models/{model_id}/features`

Example request:
```json
{
  "temperature": 20.5,
  "humidity": 60,
  "season": "Winter"
}
```

Example response:
```json
{
  "model_id": "<model-id>",
  "prediction": 123.45
}
```

### Account management

#### Logout

- `POST /auth/logout`
- Headers:
  - `Authorization: Bearer <access_token>`
- Logs out the current session.

#### Delete account

- `DELETE /auth/delete-account`
- Headers:
  - `Authorization: Bearer <access_token>`
- Permanently deletes the account and all user models.

## Error handling

- `400` - validation or request format error
- `401` - authentication required or invalid token
- `403` - forbidden access to another user's resources
- `500` - server or database error

## Notes

- All model and job endpoints require authentication.
- Use `/models/{model_id}/features` before `/models/{model_id}/predict` to know the required input fields.
- The deployed Swagger UI is available at:
  `https://mayurtetwar123--automl-api-fastapi-app.modal.run/docs`

    "models": [
      {
        "model_id": "<model-id>",
        "model_name": "Random Forest",
        "type": "Regression",
        "score": 0.92,
        "created_at": "2026-05-15T12:34:56Z"
      }
    ]
  }
  ```

#### Get model metadata

- `GET /models/{model_id}`
- Response includes the model record and stored metadata.

#### Get model feature schema

- `GET /models/{model_id}/features`
- Response includes expected feature names and types, plus an example input template.

Example response:
```json
{
  "model_id": "<model-id>",
  "feature_count": 6,
  "features": {
    "temperature": "float",
    "humidity": "float",
    "season": "string"
  },
  "example_input": {
    "temperature": "?",
    "humidity": "?",
    "season": "?"
  }
}
```

#### Predict with a model

- `POST /models/{model_id}/predict`
- Request body: JSON object with all required features returned by `/models/{model_id}/features`

Example request:
```json
{
  "temperature": 20.5,
  "humidity": 60,
  "season": "Winter"
}
```

Example response:
```json
{
  "model_id": "<model-id>",
  "prediction": 123.45
}
```

### Authentication and account management

#### Logout

- `POST /auth/logout`
- Logs out the current session.

#### Delete account

- `DELETE /auth/delete-account`
- Permanently deletes the account and all user models.

## Error handling

- `400` - validation or request format error
- `401` - authentication required or invalid token
- `403` - forbidden access to another user's resources
- `500` - server or database error

## Notes

- All model and job endpoints are scoped to the authenticated user.
- Use `/models/{model_id}/features` before `/models/{model_id}/predict` to know the required input fields.
- The backend currently allows all CORS origins; adjust that in production if needed.
- If you are calling the API from a browser app, include the `Authorization` header in every request.
