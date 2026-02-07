#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

echo "=========================================="
echo "  Plasma Backend Tests — $BASE_URL"
echo "=========================================="

failed=0
for script in health.sh core_user.sh tontine.sh; do
  path="$SCRIPT_DIR/$script"
  if [[ ! -x "$path" ]]; then
    chmod +x "$path"
  fi
  echo ""
  if "$path"; then
    :
  else
    ((failed++)) || true
  fi
done

echo ""
echo "=========================================="
if [[ $failed -eq 0 ]]; then
  echo -e "  ${GREEN}All tests passed.${NC}"
  echo "=========================================="
  exit 0
else
  echo -e "  ${RED}$failed script(s) failed.${NC}"
  echo "=========================================="
  exit 1
fi
