#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env >/dev/null 2>&1 || true
  set +a
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
  exit 1
fi

BASE_URL="${SUPABASE_URL%/}/rest/v1"

fetch() {
  local query="$1"
  curl -sS "${BASE_URL}/${query}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept: application/json"
}

echo "== Corre Shop Pricing Audit =="
echo "Project: ${SUPABASE_URL}"
echo

SNAPSHOT_JSON="$(fetch "corre_shop_items?select=id,title,price_cents,points_price,allow_points_discount,max_points_discount_percent,is_active,stock,updated_at&order=created_at.asc")"

echo "-- 1) Items with price/legacy mirror divergence (price_cents != points_price)"
if command -v jq >/dev/null 2>&1; then
  DIVERGENCE_JSON="$(echo "${SNAPSHOT_JSON}" | jq '[.[] | select(.price_cents != null and .points_price != null and .price_cents != .points_price)]')"
  echo "Count: $(echo "${DIVERGENCE_JSON}" | jq 'length')"
  echo "${DIVERGENCE_JSON}" | jq .
else
  echo "jq not found; showing raw rows snapshot instead:"
  echo "${SNAPSHOT_JSON}"
fi
echo

echo "-- 2) Active items with invalid minimum charge (price_cents < 50)"
MIN_PRICE_JSON="$(fetch "corre_shop_items?select=id,title,price_cents,points_price,is_active,stock&is_active=eq.true&price_cents=lt.50&order=price_cents.asc")"
if command -v jq >/dev/null 2>&1; then
  echo "Count: $(echo "${MIN_PRICE_JSON}" | jq 'length')"
  echo "${MIN_PRICE_JSON}" | jq .
else
  echo "${MIN_PRICE_JSON}"
fi
echo

echo "-- 3) Active items snapshot (price + points discount config)"
if command -v jq >/dev/null 2>&1; then
  echo "Count: $(echo "${SNAPSHOT_JSON}" | jq '[.[] | select(.is_active == true)] | length')"
  echo "${SNAPSHOT_JSON}" | jq '[.[] | select(.is_active == true)]'
else
  echo "${SNAPSHOT_JSON}"
fi
echo

echo "Audit complete."
