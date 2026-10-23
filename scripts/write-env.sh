#!/usr/bin/env bash
# Point the dev app at the local Supabase API. Writes apps/web/.env.local (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(bash scripts/supabase.sh status -o env 2>/dev/null | grep -E '^(API_URL|PUBLISHABLE_KEY)=')"
[[ -n "${API_URL:-}" && -n "${PUBLISHABLE_KEY:-}" ]] || { echo >&2 'Local Supabase is not running; run make up first.'; exit 1; }
printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$API_URL" "$PUBLISHABLE_KEY" > apps/web/.env.local
echo 'Wrote apps/web/.env.local: private sync points at the local Supabase API.'
