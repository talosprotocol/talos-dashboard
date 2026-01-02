#!/usr/bin/env bash
# Contract compliance gates for dashboard
# Enforces @talosprotocol/contracts as single source of truth
set -euo pipefail

ROOT="${1:-.}"

echo "=== Contract Compliance Gates ==="

# 1) Deep-link ban (no relative paths to other repos, no file:/// URLs)
echo "Checking for deep link imports..."
if grep -rn "file:///\|\.\./talos-\|workspace/\|github\.com/talosprotocol/talos/blob" "$ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null; then
  echo "❌ ERROR: deep links detected"
  exit 1
fi
echo "✅ No deep links"

# 2) btoa/atob ban (browser encoding not contract-compliant)
echo "Checking for banned btoa/atob usage..."
if grep -rn "\bbtoa\b\|\batob\b" "$ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null; then
  echo "❌ ERROR: btoa/atob detected. Use @talosprotocol/contracts helpers."
  exit 1
fi
echo "✅ No btoa/atob in src/"

# 3) Verify thin wrapper files import from package (authoritative check)
# The wrappers MUST import from @talosprotocol/contracts
echo "Checking cursor.ts imports from package..."
if grep -q "@talosprotocol/contracts" "$ROOT/src/lib/integrity/cursor.ts" 2>/dev/null; then
  echo "✅ cursor.ts imports from @talosprotocol/contracts"
else
  echo "❌ ERROR: cursor.ts does not import from @talosprotocol/contracts"
  exit 1
fi

echo "Checking base64url.ts imports from package..."
if grep -q "@talosprotocol/contracts" "$ROOT/src/lib/encoding/base64url.ts" 2>/dev/null; then
  echo "✅ base64url.ts imports from @talosprotocol/contracts"
else
  echo "❌ ERROR: base64url.ts does not import from @talosprotocol/contracts"
  exit 1
fi

# 4) Ban EXACT contract function name implementations
# Catches: function deriveCursor, function decodeCursor, function compareCursor
# Does NOT catch: function decodeCursorCompat (compatibility wrapper is OK)
echo "Checking for exact contract function reimplementations..."
if grep -rn "^\s*function\s\+deriveCursor\s*(\|^\s*function\s\+decodeCursor\s*(\|^\s*function\s\+compareCursor\s*(\|^\s*const\s\+deriveCursor\s*=\|^\s*const\s\+decodeCursor\s*=\|^\s*const\s\+compareCursor\s*=" "$ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "export\s*{"; then
  echo "❌ ERROR: local cursor implementation detected (exact name match)"
  exit 1
fi
echo "✅ No local contract reimplementations"

# 5) Ban base64 primitives in src/lib encoding (except imports)
echo "Checking for base64 primitive usage..."
if grep -rn "\bbtoa\b\|\batob\b" "$ROOT/src/lib/encoding" --include="*.ts" 2>/dev/null; then
  echo "❌ ERROR: base64 primitives detected in src/lib/encoding"
  exit 1
fi
echo "✅ No base64 primitives in encoding/"

echo ""
echo "=== All contract gates passed ✅ ==="
