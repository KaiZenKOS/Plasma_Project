#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

info "GET $BASE_URL/health"
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [[ "$code" == "200" ]]; then
  if echo "$body" | grep -q '"status":"ok"'; then
    pass "Health check OK"
  else
    fail "Health response body unexpected: $body"
    exit 1
  fi
else
  fail "Health returned $code"
  exit 1
fi
