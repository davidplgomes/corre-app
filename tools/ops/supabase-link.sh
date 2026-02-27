#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_REF_FILE="$ROOT_DIR/supabase/.temp/project-ref"
ENV_FILE="$ROOT_DIR/.env"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed."
  echo "Run: brew install supabase/tap/supabase"
  exit 1
fi

PROJECT_REF="${1:-}"

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

if [[ -z "$PROJECT_REF" && -f "$PROJECT_REF_FILE" ]]; then
  PROJECT_REF="$(tr -d '[:space:]' < "$PROJECT_REF_FILE")"
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo "Missing project ref."
  echo "Usage: $0 <project-ref>"
  echo "Tip: expected a cached ref in supabase/.temp/project-ref"
  exit 1
fi

cd "$ROOT_DIR"
echo "Linking Supabase project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"
echo "Supabase link completed."
