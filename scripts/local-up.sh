#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

require_docker
ensure_network
bash scripts/supabase.sh start --network-id "$HORDEMIND_NETWORK"
bash scripts/supabase.sh status
warn_if_exposed
bash scripts/write-env.sh
printf '\nLocal PostgreSQL: 127.0.0.1:54322 (dev only)\nStudio: http://127.0.0.1:54323\nRun the web app: make dev\n'
