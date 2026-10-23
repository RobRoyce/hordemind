#!/usr/bin/env bash
# Run the Supabase CLI from the repository root.
# Uses an installed `supabase` when present, otherwise the version CI pins.
set -euo pipefail

# Keep in sync with supabase/setup-cli in .github/workflows/v2-quality.yml.
SUPABASE_VERSION=2.84.2

cd "$(dirname "${BASH_SOURCE[0]}")/.."
if command -v supabase >/dev/null 2>&1; then
  exec supabase "$@"
fi
exec npx --yes "supabase@$SUPABASE_VERSION" "$@"
