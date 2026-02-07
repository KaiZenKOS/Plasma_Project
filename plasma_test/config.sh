#!/usr/bin/env bash
# Configuration des tests backend
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_WALLET="${TEST_WALLET:-0x70997970C51812dc3A010C7d01b50e0d17dc79C8}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; }
info() { echo -e "${YELLOW}[INFO]${NC} $*"; }
