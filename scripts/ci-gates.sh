#!/usr/bin/env bash
# CI gates for contract compliance
# Run from dashboard root: ./scripts/ci-gates.sh

set -euo pipefail

echo "=== Checking contract compliance ==="

# 1) Deep link ban
echo "Checking for deep links..."
if rg "file:///|../talos-contracts|../talos/|workspace/study" . --glob '!node_modules' --glob '!.git' 2>/dev/null; then
    echo "ERROR: Deep links found (banned)"
    exit 1
fi
echo "✅ No deep links"

# 2) Browser btoa/atob ban
echo "Checking for banned btoa/atob usage..."
if rg "\bbtoa\b|\batob\b" src/ 2>/dev/null; then
    echo "ERROR: btoa/atob found in src/ - use @talosprotocol/contracts base64url helpers"
    exit 1
fi
echo "✅ No btoa/atob in src/"

# 3) Contract logic duplication ban
echo "Checking for duplicated contract logic..."
if rg "function deriveCursor|function compareCursor|base64url.*=.*\(" src/ --glob '!**/cursor.ts' --glob '!**/base64url.ts' 2>/dev/null | rg -v "@talosprotocol/contracts"; then
    echo "ERROR: Contract logic duplicated outside of re-export wrappers"
    exit 1
fi
echo "✅ No contract logic duplication"

echo ""
echo "=== All CI gates passed ✅ ==="
