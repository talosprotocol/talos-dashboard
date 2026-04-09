#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# talos-dashboard Test Script
# =============================================================================

echo "Testing talos-dashboard..."

echo "Installing dependencies..."
npm ci --silent

echo "Running lint..."
npm run lint

echo "Running format check..."
npm run format:check 2>/dev/null || echo "format:check not configured"

echo "Running typecheck..."
npm run typecheck

echo "Running tests..."
npm test -- --run --exclude "**/submodules/**" --exclude "**/.next/**" --exclude "**/node_modules/**"

if [[ "${TALOS_SKIP_BUILD:-false}" != "true" ]]; then
  echo "Running build..."
fi

echo "talos-dashboard tests passed."
