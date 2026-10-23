# HordeMind — local development (zero hosted infrastructure)

This project uses the **Supabase CLI's Docker runtime**, not a paid Supabase project. It runs a local PostgreSQL instance **plus the Auth schema** used by our row-level security migration. Using `postgres:17` alone would fail because our migrations reference `auth.users` and `auth.uid()`. Do not maintain a second divergent local schema.

## Prerequisites
- Node.js 22+
- Docker Desktop, OrbStack, Colima, or another running Docker-compatible engine.
- Supabase CLI (macOS: `brew install supabase/tap/supabase`). It can also be installed locally via npm as a dev dependency.
- npm.

For macOS and Apple Silicon, OrbStack is an optional Docker-compatible runtime, not a dependency. Docker Desktop works.

## Starting from a clean clone

```sh
git clone https://github.com/RobRoyce/hordemind.git
cd hordemind
make up
cd apps/web
npm ci
npm run dev
```

The v2 app runs at http://127.0.0.1:5173. The local Supabase dashboard is at http://127.0.0.1:54323; Postgres uses 127.0.0.1:54322, API 127.0.0.1:54321.

**Security:** `make up` creates a Docker network with loopback-only port binding and starts `supabase start --network-id hordemind-local`. Do not expose these services to a public network. Local credentials are shown by `supabase status` and must not be committed.

### Database work
- `supabase status`: URLs and development credentials.
- `supabase migration new meaningful_name`: generate a new versioned migration.
- `supabase db reset`: **deletes local records** and applies all migrations from scratch; `make reset` asks for a deliberate confirmation.
- `make types`: generate database TypeScript types from the local schema after migrations.
- `make down`: stop containers; preserves data unless explicitly told to delete.
- `make check`: web typechecks, unit tests and production build.
- `psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`: local DB; default local dev password is typically `postgres`. Check `supabase status` if that changes.

### Application persistence
The first v2 milestone **still saves runs locally in the browser**. The PostgreSQL backend and RLS schema are ready for development and migration testing, but no cloud sync and no live data submission are enabled. This avoids building implicit collection of gameplay telemetry. Later, an authenticated repository adapter will sync opt-in runs without changing the event journal format.

### CI and database test
The v2 quality workflow builds and tests the compiled app. A separate DB job runs local Supabase/Postgres in Docker, applies migrations and verifies schema/security invariants. A migration that fails there cannot be considered ready to merge.

## Migration to hosted Supabase
When community submissions become useful, configure a separate hosted Supabase **staging** project and deploy the same migrations. Never use `supabase db reset --linked` against live data; it is destructive. Keep secrets in environment variables and GitHub Secrets, not the repository.
