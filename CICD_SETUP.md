# FITMATE — CI/CD Setup Guide (GitHub Actions)

This repository uses two GitHub Actions workflows under `.github/workflows/`:
- [ci.yml](file:///c:/Users/Rakshita/Downloads/FITMATE_project-1/.github/workflows/ci.yml) — Automated testing, frontend build, ML verification, and Docker Compose smoke check.
- [cd.yml](file:///c:/Users/Rakshita/Downloads/FITMATE_project-1/.github/workflows/cd.yml) — Builds/pushes versioned Docker images to GitHub Container Registry (`ghcr.io`) and deploys only from `main` after CI passes.

---

## 1. CI Workflow (`ci.yml`)
Runs automatically on:
- **Push** to `main`, `integration/**`, and `feature/**` (all 5 team member branches).
- **Pull Requests** targeting `main` or `integration/**`.

Pipeline jobs:
1. **`backend-and-ml`**: Installs `FIT/backend/requirements.txt` (with `pip` cache), verifies all 5 ML `.joblib` artifacts exist on disk, and runs `python -m pytest FIT/backend/app/tests FIT/backend/tests -v`.
2. **`frontend-build-and-check`**: Runs `python FIT/frontend/build.py`, validates syntax with `node --check FIT/frontend/bundle.js`, and verifies every image path in `FIT/frontend/config/images.js` exists on disk.
3. **`docker-and-compose-verify`**: Runs `docker compose config -q`, builds both Docker images, starts the stack with `docker compose up -d`, waits for `healthy` status on `fitmate-backend` and `fitmate-frontend`, and probes `/api/v1/health` and `/nginx-health`.

---

## 2. CD Workflow (`cd.yml`)
Runs only when `FITMATE CI` succeeds on `main` (or via manual `workflow_dispatch` on `main`):
1. **`publish-images`**: Logs into `ghcr.io` with `GITHUB_TOKEN`, builds `fitmate-backend` and `fitmate-frontend`, and pushes `sha-<short>` and `latest` tags.
2. **`deploy-production`**: Targets the protected `production` GitHub Environment. If `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_SSH_KEY` secrets are configured, it deploys via SSH + `docker compose pull && docker compose up -d` and runs a post-deploy `/api/v1/health` check.

---

## 3. Required GitHub Secrets & Variables

| Name | Type | Required For | Purpose |
| :--- | :---: | :--- | :--- |
| `GITHUB_TOKEN` | Built-in | CD (`publish-images`) | Push images to `ghcr.io` |
| `CI_JWT_SECRET_KEY` | Secret (optional) | CI (`backend-and-ml`) | JWT signing key during pytest |
| `DEPLOY_HOST` | Environment Secret | CD (`deploy-production`) | Production server hostname/IP |
| `DEPLOY_USER` | Environment Secret | CD (`deploy-production`) | SSH username on target host |
| `DEPLOY_SSH_KEY` | Environment Secret | CD (`deploy-production`) | Private SSH key for deployment |
| `PRODUCTION_APP_URL` | Environment Variable | CD (`deploy-production`) | Public URL for post-deploy health check |
| `DEPLOY_PATH` | Environment Variable | CD (`deploy-production`) | Remote folder containing `docker-compose.yml` (default `/opt/fitmate`) |

---

## 4. Recommended Branch Protection Rules
Configure in **GitHub -> Settings -> Branches**:
- Protect `main` and `integration/fitmate-complete`:
  - Require a Pull Request before merging (minimum 1 approval).
  - Require status checks to pass (`backend-and-ml`, `frontend-build-and-check`, `docker-and-compose-verify`).
  - Disallow force pushes and branch deletions.
- Protect `production` Environment in **Settings -> Environments** with required reviewers so CD never deploys without approval.
