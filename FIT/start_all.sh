#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
    echo ""
    echo "Stopping FITMATE services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "FITMATE services stopped."
}

trap cleanup SIGINT SIGTERM EXIT

echo "=========================================================="
echo "           FITMATE PLATFORM - UNIFIED LAUNCHER"
echo "=========================================================="
echo "1. Starting Backend & ML Services (Port 8000)..."
"$DIR/start_backend.sh" &
BACKEND_PID=$!

echo "2. Starting Frontend Application (Port 5173)..."
"$DIR/start_frontend.sh" &
FRONTEND_PID=$!

echo ""
echo "FITMATE is live:"
echo " - Web Client:                  http://localhost:5173"
echo " - REST API:                    http://localhost:8000/api/v1"
echo " - Health & 5 Models Check:     http://localhost:8000/api/v1/health"
echo " - Models Status:               http://localhost:8000/api/v1/models/status"
echo " - API Docs (Swagger):          http://localhost:8000/docs"
echo "=========================================================="
echo "Press CTRL+C to stop all services."

wait
