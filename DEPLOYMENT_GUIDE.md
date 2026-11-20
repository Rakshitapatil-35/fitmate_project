# FITMATE — Production Deployment Guide

## 1. Current Deployment Status
FITMATE is containerized with Docker (`FIT/backend/Dockerfile`, `FIT/frontend/Dockerfile`, `docker-compose.yml`) and configured for image publishing to GitHub Container Registry (`ghcr.io`) via `.github/workflows/cd.yml`. **No external cloud server is currently provisioned in the repository** — `cd.yml` includes a safe SSH/Compose deployment hook that activates once you configure your host and GitHub Environment secrets.

---

## 2. Preparing a Linux Server (VPS / Cloud VM)
1. Install Docker Engine and Docker Compose plugin on your host.
2. Create `/opt/fitmate` and copy `docker-compose.yml` and `.env.example` -> `/opt/fitmate/.env`.
3. Edit `/opt/fitmate/.env`:
   - Set `ENVIRONMENT=production` and `DEBUG=false`.
   - Generate a strong `JWT_SECRET_KEY` (`openssl rand -hex 32`).
   - Set `CORS_ORIGINS` to your production domain(s).
4. Place a TLS-terminating reverse proxy (e.g., Caddy or Nginx + Certbot) in front of port `5173`.

---

## 3. ML Model Storage Strategy
- Currently, all 5 ML models total ~64.5 MB (`FIT/backend/models/*.joblib` + `FIT/backend/app/ml/artifacts/size_model.joblib`), which fits within Git and standard Docker image layers.
- If future retrained models exceed 100 MB, store them in **Git LFS** or a versioned object store (S3/GCS/GHCR OCI artifact) and fetch them during the Docker `builder` stage with checksum verification.

---

## 4. Automated Deployment Flow
1. Developers push to `feature/*` -> CI validates tests, frontend bundle, and Docker build.
2. PRs merge into `integration/fitmate-complete` -> full integration CI runs.
3. PR merges into `main` -> CI passes -> CD publishes `ghcr.io/<owner>/fitmate-backend` and `fitmate-frontend` -> `deploy-production` pulls and restarts containers without touching `fitmate_db_data`.
