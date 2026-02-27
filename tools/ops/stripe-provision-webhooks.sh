#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
FORCE_CREATE="${1:-}"
XDG_CONFIG_DIR="$ROOT_DIR/.tmp/xdg"

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI is not installed."
  echo "Run: brew install stripe/stripe-cli/stripe"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  echo "Run: brew install jq"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env at $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${STRIPE_API_KEY:-}" && -n "${STRIPE_SECRET_KEY:-}" ]]; then
  export STRIPE_API_KEY="$STRIPE_SECRET_KEY"
fi

if [[ -z "${STRIPE_API_KEY:-}" ]]; then
  echo "Missing Stripe API key."
  echo "Set STRIPE_API_KEY or STRIPE_SECRET_KEY in .env"
  exit 1
fi

mkdir -p "$XDG_CONFIG_DIR"
export XDG_CONFIG_HOME="$XDG_CONFIG_DIR"

if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "SUPABASE_URL is required in .env"
  exit 1
fi

platform_url="${SUPABASE_URL%/}/functions/v1/stripe-webhook"
connect_url="${SUPABASE_URL%/}/functions/v1/stripe-connect-webhook"

platform_events=(
  invoice.payment_succeeded
  invoice.payment_failed
  customer.subscription.updated
  customer.subscription.deleted
  payment_intent.succeeded
  payment_intent.payment_failed
  charge.refunded
  charge.dispute.created
)

connect_events=(
  account.updated
)

list_json="$(stripe webhook_endpoints list --limit 100)"

platform_ids_raw="$(echo "$list_json" | jq -r --arg url "$platform_url" '.data[] | select(.url == $url) | .id' | xargs)"
connect_ids_raw="$(echo "$list_json" | jq -r --arg url "$connect_url" '.data[] | select(.url == $url) | .id' | xargs)"

existing_platform_ids=()
existing_connect_ids=()

if [[ -n "$platform_ids_raw" ]]; then
  read -r -a existing_platform_ids <<<"$platform_ids_raw"
fi

if [[ -n "$connect_ids_raw" ]]; then
  read -r -a existing_connect_ids <<<"$connect_ids_raw"
fi

existing_platform_id="${existing_platform_ids[0]:-}"
existing_connect_id="${existing_connect_ids[0]:-}"

platform_secret=""
connect_secret=""

create_endpoint() {
  local target_url="$1"
  local connect="$2"
  shift 2
  local events=("$@")

  local cmd=(stripe webhook_endpoints create -d "url=$target_url")
  if [[ "$connect" == "true" ]]; then
    cmd+=(-d "connect=true")
  fi
  for event in "${events[@]}"; do
    cmd+=(-d "enabled_events[]=$event")
  done

  "${cmd[@]}"
}

delete_endpoints() {
  local label="$1"
  shift
  local ids=("$@")
  for endpoint_id in "${ids[@]}"; do
    if [[ -n "$endpoint_id" ]]; then
      echo "Deleting existing $label endpoint: $endpoint_id"
      stripe webhook_endpoints delete "$endpoint_id" --confirm >/dev/null
    fi
  done
}

if [[ "$FORCE_CREATE" == "--force-create" ]]; then
  if [[ "${#existing_platform_ids[@]}" -gt 0 ]]; then
    delete_endpoints "platform" "${existing_platform_ids[@]}"
  fi
  if [[ "${#existing_connect_ids[@]}" -gt 0 ]]; then
    delete_endpoints "connect" "${existing_connect_ids[@]}"
  fi
  existing_platform_id=""
  existing_connect_id=""
fi

if [[ -n "$existing_platform_id" && "$FORCE_CREATE" != "--force-create" ]]; then
  echo "Platform webhook already exists: $existing_platform_id"
  if [[ "${#existing_platform_ids[@]}" -gt 1 ]]; then
    echo "Warning: found ${#existing_platform_ids[@]} platform endpoints for the same URL. Consider running --force-create to clean up."
  fi
  echo "Use --force-create to create a new endpoint and rotate secret."
else
  echo "Creating platform webhook endpoint..."
  platform_json="$(create_endpoint "$platform_url" "false" "${platform_events[@]}")"
  platform_secret="$(echo "$platform_json" | jq -r '.secret // empty')"
  platform_id="$(echo "$platform_json" | jq -r '.id // empty')"
  echo "Created platform endpoint: $platform_id"
fi

if [[ -n "$existing_connect_id" && "$FORCE_CREATE" != "--force-create" ]]; then
  echo "Connect webhook already exists: $existing_connect_id"
  if [[ "${#existing_connect_ids[@]}" -gt 1 ]]; then
    echo "Warning: found ${#existing_connect_ids[@]} connect endpoints for the same URL. Consider running --force-create to clean up."
  fi
  echo "Use --force-create to create a new endpoint and rotate secret."
else
  echo "Creating connect webhook endpoint..."
  connect_json="$(create_endpoint "$connect_url" "true" "${connect_events[@]}")"
  connect_secret="$(echo "$connect_json" | jq -r '.secret // empty')"
  connect_id="$(echo "$connect_json" | jq -r '.id // empty')"
  echo "Created connect endpoint: $connect_id"
fi

if [[ -n "$platform_secret" || -n "$connect_secret" ]]; then
  echo ""
  echo "New webhook secret(s) were created."
  echo "Store these immediately and keep them private."
  if [[ -n "$platform_secret" ]]; then
    echo "  STRIPE_WEBHOOK_SECRET=$platform_secret"
  fi
  if [[ -n "$connect_secret" ]]; then
    echo "  STRIPE_CONNECT_WEBHOOK_SECRET=$connect_secret"
  fi

  if command -v supabase >/dev/null 2>&1; then
    args=()
    [[ -n "$platform_secret" ]] && args+=("STRIPE_WEBHOOK_SECRET=$platform_secret")
    [[ -n "$connect_secret" ]] && args+=("STRIPE_CONNECT_WEBHOOK_SECRET=$connect_secret")
    if [[ "${#args[@]}" -gt 0 ]]; then
      if supabase projects list >/dev/null 2>&1; then
        echo ""
        echo "Updating linked Supabase project secrets..."
        if supabase secrets set "${args[@]}"; then
          echo "Supabase webhook secrets updated."
        else
          echo "Failed to sync secrets to Supabase automatically."
          echo "Run after auth/link:"
          echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=<secret> STRIPE_CONNECT_WEBHOOK_SECRET=<secret>"
        fi
      else
        echo ""
        echo "Supabase CLI is not authenticated."
        echo "Run:"
        echo "  supabase login"
        echo "  npm run supabase:link"
        echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=<secret> STRIPE_CONNECT_WEBHOOK_SECRET=<secret>"
      fi
    fi
  else
    echo ""
    echo "Supabase CLI not available. Run this after linking:"
    echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=<secret> STRIPE_CONNECT_WEBHOOK_SECRET=<secret>"
  fi
fi

echo ""
echo "Stripe webhook provisioning complete."
