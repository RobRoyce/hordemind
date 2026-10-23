#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo >&2 'Docker-compatible CLI missing. Install Docker Desktop or OrbStack first.'
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo >&2 'Docker engine is not running.'
  exit 1
fi
if ! command -v supabase >/dev/null 2>&1; then
  echo >&2 'Supabase CLI missing. macOS: brew install supabase/tap/supabase; or add it to a project with npm install -D supabase.'
  exit 1
fi

NETWORK=hordemind-local
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  # Bind ports to loopback by default. Never expose dev Auth/Studio/Postgres publicly.
  docker network create --driver bridge \
    -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
    "$NETWORK" >/dev/null
fi

supabase start --network-id "$NETWORK"
supabase status
printf '\nLocal PostgreSQL: 127.0.0.1:54322 (dev only)\nStudio: http://127.0.0.1:54323\nRun the web app: cd apps/web && npm ci && npm run dev\n'
