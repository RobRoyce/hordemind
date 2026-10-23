#!/usr/bin/env bash
# Shared helpers for local Docker/Supabase scripts. Source, don't execute.

HORDEMIND_NETWORK=hordemind-local

require_docker() {
  command -v docker >/dev/null 2>&1 || { echo >&2 'Docker-compatible CLI missing. Install Docker Desktop or OrbStack first.'; exit 1; }
  docker info >/dev/null 2>&1 || { echo >&2 'Docker engine is not running. Start Docker Desktop or OrbStack.'; exit 1; }
}

ensure_network() {
  # Linux Docker Engine honours host_binding_ipv4. Docker Desktop for Mac
  # ignores it, so warn_if_exposed checks the actual published addresses.
  if ! docker network inspect "$HORDEMIND_NETWORK" >/dev/null 2>&1; then
    docker network create --driver bridge \
      -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
      "$HORDEMIND_NETWORK" >/dev/null
  fi
}

warn_if_exposed() {
  local exposed
  exposed="$(docker ps --filter label=com.supabase.cli.project=hordemind --format '{{.Names}} {{.Ports}}' \
    | grep -E '(0\.0\.0\.0|\[::\]):[0-9]+->' || true)"
  [[ -z "$exposed" ]] && return 0
  cat >&2 <<EOF

WARNING: local Supabase ports are published on all interfaces, not loopback:
$exposed

Other machines on your network may reach Postgres with the default dev password.
Fix once for this machine by setting the Docker engine default bind address:
  Docker Desktop > Settings > Docker Engine > add  "ip": "127.0.0.1"  > Apply & restart
Then run 'make down && make up'. Stop the stack with 'make down' when not in use.
EOF
}
