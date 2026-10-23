SHELL := /usr/bin/env bash
.PHONY: up down status reset web dev env check verify verify-clean verify-fast verify-db migrate types

up:
	bash scripts/local-up.sh

# Point the dev app at a running local Supabase API (make up does this too).
env:
	bash scripts/write-env.sh

down:
	bash scripts/supabase.sh stop

status:
	bash scripts/supabase.sh status

reset:
	bash scripts/local-reset.sh

web dev:
	cd apps/web && { test -d node_modules || npm ci --no-audit --no-fund; } && npm run dev

# Fast iteration: local commands, without waiting for GitHub Actions.
check verify:
	bash scripts/verify-local.sh

# Resolve the exact pinned npm lockfile first.
verify-clean:
	bash scripts/verify-local.sh --install

# Skip Chromium while editing pure model and domain code.
verify-fast:
	bash scripts/verify-local.sh --no-browser

# Full local stack: production build, browser smoke, real Postgres/RLS.
verify-db:
	bash scripts/verify-local.sh --with-db

migrate:
	bash scripts/local-reset.sh

types:
	bash scripts/supabase.sh gen types typescript --local > apps/web/src/domain/database.generated.ts
