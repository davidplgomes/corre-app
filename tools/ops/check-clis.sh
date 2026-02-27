#!/usr/bin/env bash
set -euo pipefail

print_status() {
  local name="$1"
  local version="$2"
  printf "OK    %-12s %s\n" "$name" "$version"
}

missing=0

if command -v supabase >/dev/null 2>&1; then
  print_status "supabase" "$(supabase --version)"
else
  echo "MISS  supabase"
  missing=1
fi

if command -v stripe >/dev/null 2>&1; then
  stripe_version="$(stripe --version 2>/dev/null || true)"
  print_status "stripe" "${stripe_version:-installed}"
else
  echo "MISS  stripe"
  missing=1
fi

if command -v eas >/dev/null 2>&1; then
  print_status "eas" "$(eas --version)"
else
  echo "MISS  eas"
  missing=1
fi

if command -v jq >/dev/null 2>&1; then
  print_status "jq" "$(jq --version)"
else
  echo "MISS  jq"
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  echo ""
  echo "Install missing tools:"
  echo "  brew install supabase/tap/supabase stripe/stripe-cli/stripe jq"
  exit 1
fi
