#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
XDG_CONFIG_DIR="$ROOT_DIR/.tmp/xdg"

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI is not installed."
  echo "Run: brew install stripe/stripe-cli/stripe"
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

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

stripe webhook_endpoints list --limit 100
