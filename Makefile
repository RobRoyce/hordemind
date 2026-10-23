SHELL := /usr/bin/env bash
.PHONY: up down status reset web dev check verify verify-clean verify-fast verify-db migrate types

up:
	bash scripts/local-up.sh

down:
	supabase stop

status:
	supabase status

reset:
	bash scripts/local-reset.sh

web dev:
	cd apps/web && npm run dev

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
	supabase db reset

types:
	supabase gen types typescript --local > apps/web/src/domain/database.generated.ts
