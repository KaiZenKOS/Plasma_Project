#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

addr="$TEST_WALLET"

# 1. PUT user (create/update)
info "PUT $BASE_URL/api/core/user/$addr"
res=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/core/user/$addr" \
  -H "Content-Type: application/json" \
  -d '{"pseudo":"TestUser","kyc_validated":false}')
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [[ "$code" != "200" ]]; then
  fail "PUT user returned $code — $body"
  exit 1
fi
if echo "$body" | grep -q '"wallet_address"'; then
  pass "PUT user OK"
else
  fail "PUT user response unexpected: $body"
  exit 1
fi

# 2. GET user
info "GET $BASE_URL/api/core/user/$addr"
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/core/user/$addr")
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [[ "$code" != "200" ]]; then
  fail "GET user returned $code — $body"
  exit 1
fi
if echo "$body" | grep -q '"reputation_score"'; then
  pass "GET user OK"
else
  fail "GET user response unexpected: $body"
  exit 1
fi

# 3. GET score
info "GET $BASE_URL/api/core/user/$addr/score"
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/core/user/$addr/score")
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [[ "$code" != "200" ]]; then
  fail "GET score returned $code — $body"
  exit 1
fi
if echo "$body" | grep -q '"score"'; then
  pass "GET score OK"
else
  fail "GET score response unexpected: $body"
  exit 1
fi

# 4. Invalid address
info "GET $BASE_URL/api/core/user/invalid (expect 400)"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/core/user/invalid")
if [[ "$code" == "400" ]]; then
  pass "Invalid address rejected (400)"
else
  fail "Invalid address returned $code (expected 400)"
  exit 1
fi

# 5. Non-existent user score (404)
info "GET score for non-existent wallet (expect 404)"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/core/user/0x0000000000000000000000000000000000000001/score")
if [[ "$code" == "404" ]]; then
  pass "Non-existent user score returns 404"
else
  fail "Non-existent user score returned $code (expected 404)"
  exit 1
fi
