#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed."
  echo "Run: brew install supabase/tap/supabase"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env at $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -f "$ROOT_DIR/.mcp.json" ]] && command -v jq >/dev/null 2>&1; then
  mcp_token="$(jq -r '.mcpServers.supabase.headers.Authorization // empty' "$ROOT_DIR/.mcp.json" | sed -E 's/^[Bb]earer[[:space:]]+//')"
  if [[ -n "$mcp_token" ]]; then
    export SUPABASE_ACCESS_TOKEN="$mcp_token"
  fi
fi

required=(
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_CONNECT_WEBHOOK_SECRET
  STRAVA_CLIENT_ID
  STRAVA_CLIENT_SECRET
  STRAVA_VERIFY_TOKEN
)

optional=(
  STRIPE_PUBLISHABLE_KEY
  RESEND_API_KEY
)

args=()

for key in "${required[@]}"; do
  value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "Missing required secret in .env: $key"
    exit 1
  fi
  args+=("$key=$value")
done

for key in "${optional[@]}"; do
  value="${!key:-}"
  if [[ -n "$value" ]]; then
    args+=("$key=$value")
  fi
done

if [[ "${#args[@]}" -eq 0 ]]; then
  echo "No secrets to sync."
  exit 1
fi

cd "$ROOT_DIR"
echo "Syncing ${#args[@]} secrets to linked Supabase project..."
supabase secrets set "${args[@]}"
echo "Supabase secrets sync completed."
