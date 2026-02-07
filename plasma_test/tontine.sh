#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

# 1. GET groups
info "GET $BASE_URL/api/tontine/groups"
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/tontine/groups")
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [[ "$code" != "200" ]]; then
  fail "GET groups returned $code — $body"
  exit 1
fi
# Response is JSON array (possibly empty)
if echo "$body" | grep -q '^\['; then
  pass "GET tontine groups OK"
else
  fail "GET groups response unexpected: $body"
  exit 1
fi

# 2. GET events
info "GET $BASE_URL/api/tontine/events?limit=5"
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/tontine/events?limit=5")
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [[ "$code" != "200" ]]; then
  fail "GET events returned $code — $body"
  exit 1
fi
if echo "$body" | grep -q '^\['; then
  pass "GET blockchain events OK"
else
  fail "GET events response unexpected: $body"
  exit 1
fi

# 3. GET group by id (UUID inexistant → 404)
group_id="00000000-0000-0000-0000-000000000000"
info "GET $BASE_URL/api/tontine/groups/$group_id"
res=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/tontine/groups/$group_id")
code=$(echo "$res" | tail -n 1)

if [[ "$code" == "200" ]]; then
  pass "GET tontine group by id OK"
elif [[ "$code" == "404" ]]; then
  pass "GET tontine group (404 for unknown id) OK"
else
  body=$(echo "$res" | head -n -1)
  fail "GET group returned $code — $body"
  exit 1
fi
