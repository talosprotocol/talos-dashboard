#!/usr/bin/env bash
# CI gates for contract compliance
# Run from dashboard root: bash scripts/ci-gates.sh

set -euo pipefail

echo "=== Contract Compliance Gates ==="

VIOLATIONS=0

# 1) Deep link ban - no relative path imports to other repos
echo "Checking for deep link imports..."
if grep -rn "\.\.\/.*talos-" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "❌ ERROR: Deep links to other repos found"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No deep links"
fi

# 2) Browser btoa/atob ban
echo "Checking for banned btoa/atob usage..."
if grep -rn "\bbtoa\b\|\batob\b" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "❌ ERROR: btoa/atob found - use contracts base64url helpers"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No btoa/atob in src/"
fi

# 3) Local contract function reimplementation ban
echo "Checking for contract logic reimplementation..."
if grep -rn "^function deriveCursor\|^function compareCursor\|^function base64url" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// Wrapper"; then
    echo "❌ ERROR: Contract logic reimplemented locally"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No contract logic duplication"
fi

# 4) Verify imports are from package, not relative paths
echo "Checking cursor.ts imports from package..."
if grep -q "@talosprotocol/contracts" src/lib/integrity/cursor.ts 2>/dev/null; then
    echo "✅ cursor.ts imports from package"
else
    echo "❌ ERROR: cursor.ts does not import from package"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

echo "Checking base64url.ts imports from package..."
if grep -q "@talosprotocol/contracts" src/lib/encoding/base64url.ts 2>/dev/null; then
    echo "✅ base64url.ts imports from package"
else
    echo "❌ ERROR: base64url.ts does not import from package"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""
if [ $VIOLATIONS -eq 0 ]; then
    echo "=== All CI gates passed ✅ ==="
    exit 0
else
    echo "=== $VIOLATIONS violations found ❌ ==="
    exit 1
fi
