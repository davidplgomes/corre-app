#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed."
  echo "Run: brew install supabase/tap/supabase"
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -f "$ROOT_DIR/.mcp.json" ]] && command -v jq >/dev/null 2>&1; then
  mcp_token="$(jq -r '.mcpServers.supabase.headers.Authorization // empty' "$ROOT_DIR/.mcp.json" | sed -E 's/^[Bb]earer[[:space:]]+//')"
  if [[ -n "$mcp_token" ]]; then
    export SUPABASE_ACCESS_TOKEN="$mcp_token"
  fi
fi

cd "$ROOT_DIR"

public_functions=(
  stripe-webhook
  stripe-connect-webhook
  strava-webhook
  strava-auth
)

protected_functions=(
  stripe-create-subscription
  create-payment-intent
  create-marketplace-payment
  stripe-connect-onboarding
  release-marketplace-funds
  send-guest-pass-email
  stripe-sync-products
)

echo "Deploying public webhook/callback functions (no JWT verification)..."
for fn in "${public_functions[@]}"; do
  echo "  -> $fn"
  supabase functions deploy "$fn" --no-verify-jwt
done

echo "Deploying protected functions (JWT verification enabled)..."
for fn in "${protected_functions[@]}"; do
  echo "  -> $fn"
  supabase functions deploy "$fn"
done

echo "Supabase function deploy completed."
