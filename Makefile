SHELL := /usr/bin/env bash
.PHONY: up down status reset web check migrate types

up:
	bash scripts/local-up.sh

down:
	supabase stop

status:
	supabase status

reset:
	bash scripts/local-reset.sh

web:
	cd apps/web && npm run dev

check:
	cd apps/web && npm run typecheck && npm run test && npm run build

migrate:
	supabase db reset

types:
	supabase gen types typescript --local > apps/web/src/domain/database.generated.ts
