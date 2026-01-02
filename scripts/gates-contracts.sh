#!/usr/bin/env bash
set -euo pipefail

fail() { echo "ERROR: $1" >&2; exit 1; }

# Define pathspecs to exclude
EXCLUDE=":^node_modules"
EXCLUDE2=":^dist"
EXCLUDE3=":^.next"
EXCLUDE4=":^.github"
EXCLUDE5=":^scripts/gates-contracts.sh"

# Deep link ban
if git grep -nE "file:///|(\.\./talos\b)|workspace/|github\.com/talosprotocol/talos/blob" -- . "$EXCLUDE" "$EXCLUDE2" "$EXCLUDE3" "$EXCLUDE4" "$EXCLUDE5"; then
  fail "Deep link detected"
fi

# Wrong package name ban
if git grep -n "@talos-protocol/contracts" -- . "$EXCLUDE" "$EXCLUDE2" "$EXCLUDE3" "$EXCLUDE4" "$EXCLUDE5"; then
  fail "Found @talos-protocol/contracts. Must use @talosprotocol/contracts."
fi

# btoa/atob ban
if git grep -nE "\bbtoa\b|\batob\b" -- src/ ; then
  fail "btoa/atob detected. Use @talosprotocol/contracts base64url helpers."
fi

# Contract logic duplication ban
DUP_PAT='function[[:space:]]+(deriveCursor|decodeCursor|compareCursor|base64urlEncode|base64urlDecode|isUuidV7)\b|export[[:space:]]+function[[:space:]]+(deriveCursor|decodeCursor|compareCursor|base64urlEncode|base64urlDecode|isUuidV7)\b'

if git grep -qE "$DUP_PAT" -- src/; then
  if git grep -nE "$DUP_PAT" -- src/ | grep -v "from[[:space:]].*@talosprotocol/contracts"; then
    fail "Contract logic appears implemented in dashboard. Only import or re-export from @talosprotocol/contracts."
  fi
fi

echo "OK: contract gates passed"
