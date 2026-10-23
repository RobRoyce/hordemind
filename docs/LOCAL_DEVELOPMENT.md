# HordeMind — local development (zero hosted infrastructure)

This project uses the **Supabase CLI's Docker runtime**, not a paid Supabase project. It runs a local PostgreSQL instance **plus the Auth schema** used by our row-level security migration. Using `postgres:17` alone would fail because our migrations reference `auth.users` and `auth.uid()`. Do not maintain a second divergent local schema.

## Prerequisites
- Node.js 22+
- Docker Desktop, OrbStack, Colima, or another running Docker-compatible engine.
- Supabase CLI is optional. `scripts/supabase.sh` uses an installed `supabase` binary, or runs the CI-pinned version through `npx` when none is installed.
- npm.

For macOS and Apple Silicon, OrbStack is an optional Docker-compatible runtime, not a dependency. Docker Desktop works.

## Starting from a clean clone

```sh
git clone https://github.com/RobRoyce/hordemind.git
cd hordemind
make up    # optional: local Postgres + Auth + Studio
make dev   # installs pinned npm dependencies on first run
```

The v2 app runs at http://127.0.0.1:5173. The local Supabase dashboard is at http://127.0.0.1:54323; Postgres uses 127.0.0.1:54322, API 127.0.0.1:54321.

**Security:** `make up` starts the stack on a `hordemind-local` Docker network that requests loopback-only port binding. Linux Docker Engine honours that. **Docker Desktop for Mac ignores it** and publishes Postgres, the API, and Studio on `0.0.0.0`, reachable from your LAN with the well-known dev password. `make up` prints a warning when this happens. The durable fix is a one-time engine setting: Docker Desktop → Settings → Docker Engine → add `"ip": "127.0.0.1"` → Apply & restart. Until then, run `make down` when you are not using the database. Local credentials are shown by `make status` and must not be committed.

### Database work
- `make status`: URLs and development credentials.
- `bash scripts/supabase.sh migration new meaningful_name`: generate a new versioned migration.
- `make reset` (alias `make migrate`): **deletes local records** and replays all migrations after a typed confirmation.
- `make types`: generate database TypeScript types from the local schema after migrations.
- `make down`: stop containers; preserves data unless explicitly told to delete.
- `make check`: web typechecks, unit tests and production build.
- `psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`: local DB; default local dev password is typically `postgres`. Check `supabase status` if that changes.

### Application persistence and private sync
The browser journal is the source of truth. **Private sync** to the local Supabase stack is opt-in ([ADR 0005](adr/0005-private-sync.md)):

1. `make up` starts the stack and writes `apps/web/.env.local` (gitignored) with the local API URL and publishable key. If the stack is already running, `make env` does just this step.
2. `make dev`, then open Insights → Private sync → Create account. Local Auth needs no email confirmation.
3. Sync pulls, merges and pushes. Clearing the browser and signing in again restores your runs.

Builds without that env, including the public Pages site, show sync as unavailable and stay browser-only. Private sync never writes community research data.

## Local verification — the default development loop

**Do not wait for GitHub Actions while iterating.** From the repository root:

```sh
make verify        # TypeScript + unit tests + production Vite build + real-browser smoke
make verify-fast   # Same checks without the browser (for pure domain/model changes)
make verify-clean  # Reinstall pinned lockfile dependencies, then full checks
make verify-db     # Add actual Docker/Postgres migration and RLS integration checks
```

`make verify` starts a local production preview at `http://127.0.0.1:4173` (not the regular Vite dev port), runs `apps/web/tests/e2e.mjs` against it, then terminates the preview. Set `HORDEMIND_TEST_PORT` to another unused port if necessary. Chrome is used by default; if Chrome isn't installed, run `npx playwright install chromium` from `apps/web` and set `E2E_BUNDLED_CHROMIUM=1`.

The database is **optional for frontend development**. Use `make up` to run the complete local Supabase stack, or `make verify-db` for a focused SQL security check. The SQL test uses `BEGIN ... ROLLBACK` and does not reset your local game data. `make verify-db` starts Postgres, Auth, PostgREST and Kong (no Studio). It then runs the SQL invariants, the live private-sync integration tests, and a check that synced records survive a Postgres restart. If the stack was not already running, it stops it again afterwards.

`make verify` reuses `node_modules` unless `package-lock.json` is newer than the last install, in which case it runs `npm ci` first. `make verify-clean` always reinstalls. GitHub Actions remains the final release guard after a PR; it should not be your interactive debugging loop.

### Access scope

A container or terminal started in another isolated environment is **not your Mac's Docker daemon**. Run these commands in your own checkout on the machine where Docker/OrbStack is running. Do not expose development ports or Auth to the public internet.

### CI and database test
The v2 quality workflow builds and tests the compiled app. A separate DB job runs local Supabase/Postgres in Docker, applies migrations and verifies schema/security invariants. A migration that fails there cannot be considered ready to merge.

## Migration to hosted Supabase
When community submissions become useful, configure a separate hosted Supabase **staging** project and deploy the same migrations. Never use `supabase db reset --linked` against live data; it is destructive. Keep secrets in environment variables and GitHub Secrets, not the repository.
