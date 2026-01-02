#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

# 1) Deep link ban
if rg -n "file:///|(\.\./talos\b)|workspace/|github\.com/talosprotocol/talos/blob" -S .; then
  fail "Deep link detected"
fi

# 2) btoa/atob ban (browser encoding)
if rg -n "\bbtoa\b|\batob\b" -S src/; then
  fail "btoa/atob detected. Use @talosprotocol/contracts base64url helpers."
fi

# 3) Contract logic duplication ban (implementation patterns)
# Allow only:
# - imports from @talosprotocol/contracts
# - re-exports that re-export directly from @talosprotocol/contracts
DUP_PAT='function\s+(deriveCursor|decodeCursor|compareCursor|base64urlEncode|base64urlDecode|isUuidV7)\b|export\s+function\s+(deriveCursor|decodeCursor|compareCursor|base64urlEncode|base64urlDecode|isUuidV7)\b'

if rg -n "$DUP_PAT" -S src/; then
  # If any match exists, fail unless it is a direct re-export line
  # (This is intentionally strict)
  if rg -n "$DUP_PAT" -S src/ | rg -v "from\s+['\"]@talosprotocol/contracts['\"]"; then
    fail "Contract logic appears implemented in dashboard. Only thin re-exports/imports allowed from @talosprotocol/contracts."
  fi
fi

# 4) Enforce correct package name
if rg -n "@talos-protocol/contracts" -S .; then
  fail "Found @talos-protocol/contracts. Must use @talosprotocol/contracts."
fi

echo "OK: contract gates passed"
