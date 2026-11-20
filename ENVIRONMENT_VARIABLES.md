# FITMATE — Environment Variables Reference

Copy `.env.example` to `.env` at the repository root before running Docker Compose. **Never commit `.env` to Git.**

| Variable | Default / Example | Required | Description |
| :--- | :--- | :---: | :--- |
| `APP_NAME` | `Size Recommendation API` | No | FastAPI service title |
| `APP_VERSION` | `1.0.0` | No | API version reported in `/api/v1/health` |
| `ENVIRONMENT` | `production` | Yes | `development` or `production` |
| `DEBUG` | `false` | No | Disable verbose debug traces in production |
| `API_V1_PREFIX` | `/api/v1` | No | Base path for REST API routers |
| `LOG_LEVEL` | `INFO` | No | Application logging level |
| `BACKEND_PORT` | `8000` | No | Host port mapped to backend `:8000` |
| `FRONTEND_PORT` | `5173` | No | Host port mapped to Nginx `:5173` |
| `DATABASE_URL` | `sqlite:////app/data/size_recommendation.db` | Yes | SQLAlchemy database URI inside persistent volume |
| `JWT_SECRET_KEY` | *(32+ char random string)* | **Yes** | Secret used to sign/verify JWT tokens |
| `JWT_ALGORITHM` | `HS256` | No | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | No | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | No | Refresh token lifetime in days |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Yes | Comma-separated allowed origins |
| `AUTH_RATE_LIMIT_REQUESTS` | `10` | No | Max auth requests per window |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `60` | No | Auth rate-limit window in seconds |
| `ML_MODEL_PATH` | `app/ml/artifacts/size_model.joblib` | No | Primary size model artifact path |
| `ML_ENABLED` | `true` | No | Enable ML hybrid predictions (falls back to rules if disabled) |
| `ML_MIN_CONFIDENCE` | `0.55` | No | Minimum confidence threshold (`0.0`–`1.0`) |
| `EASE_CONFIG_PATH` | `app/services/ease_config.json` | No | Garment ease configuration JSON path |
