#!/usr/bin/env bash
# Run the same production-build checks locally before any push.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"
PORT="${HORDEMIND_TEST_PORT:-4173}"
WITH_DB=0
WITH_BROWSER=1
INSTALL=0
usage() { echo 'Usage: bash scripts/verify-local.sh [--with-db] [--no-browser] [--install]'; }
for arg in "$@"; do
  case "$arg" in
    --with-db) WITH_DB=1 ;;
    --no-browser) WITH_BROWSER=0 ;;
    --install) INSTALL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done
say() { printf '\n==> %s\n' "$*"; }
command -v node >/dev/null || { echo 'Node.js 22+ is required' >&2; exit 1; }
command -v npm >/dev/null || { echo 'npm is required' >&2; exit 1; }
if (( $(node -p 'parseInt(process.versions.node, 10)') < 22 )); then echo 'Node.js 22+ is required' >&2; exit 1; fi
cd "$WEB"

# npm ci writes node_modules/.package-lock.json; a newer lockfile means a stale install.
if [[ "$INSTALL" == 1 || ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  say 'Install pinned dependencies (npm ci)'
  npm ci --no-audit --no-fund
fi
say 'TypeScript static checks'
npm run typecheck
say 'Unit and deterministic simulation tests'
npm run test
say 'Build exact production bundle'
npm run build
if (( WITH_BROWSER )); then
  say "Smoke test production bundle on http://127.0.0.1:$PORT"
  log="$(mktemp -t hordemind-vite.XXXXXX)"
  ./node_modules/.bin/vite preview --host 127.0.0.1 --port "$PORT" --strictPort > "$log" 2>&1 &
  pid=$!
  cleanup() { kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; rm -f "$log"; }
  trap cleanup EXIT
  ready=0
  for _ in $(seq 1 40); do
    if curl --silent --fail --max-time 1 "http://127.0.0.1:$PORT/" >/dev/null; then ready=1; break; fi
    if ! kill -0 "$pid" 2>/dev/null; then break; fi
    sleep 0.25
  done
  if (( ! ready )); then echo "Preview server failed; log:" >&2; cat "$log" >&2; exit 1; fi
  E2E_BASE_URL="http://127.0.0.1:$PORT/" node tests/e2e.mjs
  cleanup
  trap - EXIT
fi
if (( WITH_DB )); then
  say 'Test Dockerized Supabase/Postgres migrations and owner isolation'
  cd "$ROOT"
  source scripts/lib.sh
  require_docker
  ensure_network

  # Leave the stack as we found it: stop the database only if this script started it.
  db_was_running=0
  docker ps --format '{{.Names}}' | grep -qx supabase_db_hordemind && db_was_running=1
  bash scripts/supabase.sh db start --network-id "$HORDEMIND_NETWORK"
  if (( ! db_was_running )); then
    trap 'bash "$ROOT/scripts/supabase.sh" stop >/dev/null 2>&1 || true' EXIT
  else
    warn_if_exposed
  fi
  docker ps --format '{{.Names}}' | grep -qx supabase_db_hordemind \
    || { echo 'Cannot find supabase_db_hordemind; inspect docker ps and make status.' >&2; exit 1; }
  docker exec -i supabase_db_hordemind psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$ROOT/supabase/tests/security_invariants.sql"
fi
say 'LOCAL VERIFICATION PASSED — ready to commit / push'
