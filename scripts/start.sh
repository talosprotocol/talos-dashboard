#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="talos-dashboard"
PID_FILE="/tmp/${SERVICE_NAME}.pid"
PORT="${TALOS_DASHBOARD_PORT:-3000}"

cd "$REPO_DIR"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "$SERVICE_NAME is already running"
    exit 0
fi

echo "Starting $SERVICE_NAME on port $PORT..."
export NEXT_PUBLIC_TALOS_DATA_MODE="HTTP"
export NEXT_PUBLIC_API_URL="http://localhost:8080"
npm run dev -- --port "$PORT" > "/tmp/${SERVICE_NAME}.log" 2>&1 &
echo $! > "$PID_FILE"
sleep 3

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✓ $SERVICE_NAME started (Port: $PORT)"
else
    echo "✗ $SERVICE_NAME failed to start"
    exit 1
fi
