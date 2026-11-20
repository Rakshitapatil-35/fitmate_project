#!/usr/bin/env bash
set -e

# FITMATE Frontend Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/frontend"

echo "Starting FITMATE Smart Sizing Frontend on http://localhost:5173..."
exec python3 -m http.server 5173
