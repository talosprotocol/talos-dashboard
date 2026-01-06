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
# Node.js artifacts
rm -rf node_modules .next out dist build .eslintcache .turbo
rm -rf .tsbuildinfo *.tsbuildinfo
# Coverage & reports
rm -rf coverage 2>/dev/null || true
rm -f lcov.info coverage.xml junit.xml 2>/dev/null || true

echo "✓ $SERVICE_NAME cleaned"
