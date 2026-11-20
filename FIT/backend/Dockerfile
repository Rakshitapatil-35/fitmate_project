# ============================================================================
# FITMATE BACKEND DOCKERFILE (FastAPI + SQLite + 5 ML Models)
# Multi-stage build with non-root runtime user and model/DB healthcheck
# ============================================================================

FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DATABASE_URL="sqlite:////app/data/size_recommendation.db"

WORKDIR /app

# libgomp1 is required by xgboost and scikit-learn OpenMP kernels
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and persistent SQLite data directory
RUN groupadd --gid 10001 fitmate \
    && useradd --uid 10001 --gid fitmate --shell /bin/bash --create-home fitmate \
    && mkdir -p /app/data \
    && chown -R fitmate:fitmate /app

COPY --from=builder /opt/venv /opt/venv

# Copy application source, Alembic migrations, seed script, and all 5 ML models
COPY --chown=fitmate:fitmate app ./app
COPY --chown=fitmate:fitmate models ./models
COPY --chown=fitmate:fitmate alembic ./alembic
COPY --chown=fitmate:fitmate alembic.ini ./alembic.ini
COPY --chown=fitmate:fitmate seed.py ./seed.py
COPY --chown=fitmate:fitmate requirements.txt ./requirements.txt

USER fitmate

EXPOSE 8000

# Verify HTTP /api/v1/health, healthy status, and all 5 ML models loaded
HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
    CMD python -c "import json, urllib.request; r = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=5).read()); assert r.get('status') == 'healthy' and r.get('models_ready', 0) >= 5, r"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
