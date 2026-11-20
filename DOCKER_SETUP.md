# FITMATE — Docker Setup Guide

This guide explains how to build, run, inspect, and stop the containerized FITMATE application locally using Docker and Docker Compose.

---

## 1. Prerequisites
- **Docker Engine** / **Docker Desktop** (v24+ recommended)
- **Docker Compose** (v2+ or `docker-compose` v2+)
- Copy the environment template before starting:
  ```bash
  cp .env.example .env
  ```
  Update `JWT_SECRET_KEY` in `.env` with a secure random 32+ character string before deploying.

---

## 2. Architecture Overview
- **`backend` (`FIT/backend/Dockerfile`)**: Multi-stage `python:3.12-slim` image running FastAPI + Uvicorn on port `8000` as non-root user `fitmate`, with `libgomp1` for `xgboost`/`scikit-learn` and all 5 ML `.joblib` models baked into `/app/models` and `/app/app/ml/artifacts`.
- **`frontend` (`FIT/frontend/Dockerfile`)**: Multi-stage build running `python build.py` in stage 1 and serving the static vanilla JS app via unprivileged Nginx (`nginxinc/nginx-unprivileged:1.27-alpine`) on port `5173`. Reverse-proxies `/api/` and `/health` to `http://backend:8000` over the `fitmate_net` bridge network.
- **Persistent Volume (`fitmate_db_data`)**: Mounted at `/app/data` in `fitmate-backend` so SQLite (`size_recommendation.db`) persists across container restarts and image rebuilds.

---

## 3. Common Commands

```bash
# Build both images
docker compose build

# Start frontend and backend in detached mode (waits for backend healthcheck)
docker compose up -d

# Check container & healthcheck status
docker compose ps

# Follow live logs from both services
docker compose logs -f

# Stop and remove containers (KEEPS persistent database volume fitmate_db_data)
docker compose down
```

> [!WARNING]
> **Never use `docker compose down -v` as a normal cleanup command.**
> - `docker compose down` stops and removes containers/networks while **preserving** `fitmate_db_data` (saved users, measurement profiles, and recommendations).
> - `docker compose down -v` **deletes all named volumes**, permanently wiping your SQLite database. Only use `-v` when you intentionally want a clean reset.

---

## 4. Health Checks & Verification
- **Backend Health**: `http://localhost:8000/api/v1/health` (verifies FastAPI is running, `status == "healthy"`, and `models_ready >= 5`).
- **Frontend UI**: `http://localhost:5173/` (and `http://localhost:5173/nginx-health` for Nginx readiness).
- **Reverse-Proxy Check**: `http://localhost:5173/api/v1/health` verifies Nginx -> `backend:8000` internal container networking.

---

## 5. Troubleshooting
- **Docker daemon not reachable (`docker_engine` pipe error on Windows)**: Start Docker Desktop and wait until the engine status shows "Running", then re-run `docker compose up -d`.
- **ML model loading errors**: Ensure `FIT/backend/models/*.joblib` and `FIT/backend/app/ml/artifacts/size_model.joblib` were not excluded by `.dockerignore` and `libgomp1` is installed.
- **Port 5173 or 8000 already in use**: Stop any local `uvicorn` or `http.server` processes, or change `BACKEND_PORT` / `FRONTEND_PORT` in `.env`.
