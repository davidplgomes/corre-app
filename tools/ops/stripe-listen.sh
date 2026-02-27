#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
MODE="${1:-remote}"
XDG_CONFIG_DIR="$ROOT_DIR/.tmp/xdg"

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI is not installed."
  echo "Run: brew install stripe/stripe-cli/stripe"
  exit 1
fi

if [[ "$MODE" != "remote" && "$MODE" != "local" ]]; then
  echo "Usage: $0 [remote|local]"
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

if [[ "$MODE" == "remote" ]]; then
  if [[ -z "${SUPABASE_URL:-}" ]]; then
    echo "SUPABASE_URL is required for remote listen mode."
    exit 1
  fi
  base_url="${SUPABASE_URL%/}/functions/v1"
else
  base_url="http://127.0.0.1:54321/functions/v1"
fi

platform_endpoint="$base_url/stripe-webhook"
connect_endpoint="$base_url/stripe-connect-webhook"

platform_events="invoice.payment_succeeded,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted,payment_intent.succeeded,payment_intent.payment_failed,charge.refunded,charge.dispute.created"
connect_events="account.updated"

echo "Starting Stripe listener in $MODE mode"
echo "Platform endpoint: $platform_endpoint"
echo "Connect endpoint:  $connect_endpoint"
echo ""
echo "If you run local mode, copy the displayed webhook secret(s) and set:"
echo "  STRIPE_WEBHOOK_SECRET and STRIPE_CONNECT_WEBHOOK_SECRET"
echo ""

stripe listen \
  --events "$platform_events,$connect_events" \
  --forward-to "$platform_endpoint" \
  --forward-connect-to "$connect_endpoint"
