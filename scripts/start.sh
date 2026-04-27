#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SERVICE_NAME="talos-dashboard"
PID_FILE="/tmp/${SERVICE_NAME}.pid"

source_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        set -a
        . "$file"
        set +a
    fi
}

source_env_file "$ROOT_DIR/.env"
source_env_file "$ROOT_DIR/.env.local"
source_env_file "$REPO_DIR/.env"
source_env_file "$REPO_DIR/.env.local"

PORT="${TALOS_DASHBOARD_PORT:-3000}"
HOST="${TALOS_BIND_HOST:-127.0.0.1}"
GATEWAY_PORT="${TALOS_GATEWAY_PORT:-8001}"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:${GATEWAY_PORT}}"
DB_URL="${DATABASE_URL:-${TALOS_DATABASE_URL:-postgres://postgres:password@localhost:5432/talos}}"

cd "$REPO_DIR"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "$SERVICE_NAME is already running"
    exit 0
fi

echo "Starting $SERVICE_NAME on port $PORT..."
export NEXT_PUBLIC_TALOS_DATA_MODE="HTTP"
export NEXT_PUBLIC_API_URL="$API_URL"
export DATABASE_URL="$DB_URL"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"
export WATCHPACK_POLLING="${WATCHPACK_POLLING:-2000}"
ulimit -n 8192 2>/dev/null || true
echo "Using configured dashboard database URL"
echo "If this is the first auth-enabled run, apply migrations with: npm run db:migrate"
nohup npm run dev -- --hostname "$HOST" --port "$PORT" > "/tmp/${SERVICE_NAME}.log" 2>&1 &
echo $! > "$PID_FILE"
sleep 3

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✓ $SERVICE_NAME started (Port: $PORT)"
else
    echo "✗ $SERVICE_NAME failed to start"
    exit 1
fi
