#!/usr/bin/env bash
set -e

# FITMATE Backend Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/backend"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

echo "Starting FITMATE Unified Backend & ML Inference Engine on http://localhost:8000..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
