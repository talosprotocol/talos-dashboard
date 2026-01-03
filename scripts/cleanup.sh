#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="talos-dashboard"
PID_FILE="/tmp/${SERVICE_NAME}.pid"

cd "$REPO_DIR"

[ -f "$PID_FILE" ] && { kill "$(cat "$PID_FILE")" 2>/dev/null || true; rm -f "$PID_FILE"; }
pkill -f "next dev" 2>/dev/null || true
rm -f "/tmp/${SERVICE_NAME}.log"
rm -rf node_modules .next out dist build coverage .eslintcache .turbo

echo "✓ $SERVICE_NAME cleaned"
