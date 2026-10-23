#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo >&2 'WARNING: This erases local Supabase database content and replays migrations.'
read -r -p "Type RESET to continue: " confirmation
if [[ "$confirmation" != "RESET" ]]; then
  echo 'Cancelled.'
  exit 1
fi
bash scripts/supabase.sh db reset
