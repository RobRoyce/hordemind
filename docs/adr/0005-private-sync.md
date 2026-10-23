# ADR 0005 — Private sync to Supabase, local-first

**Status:** Accepted (2026-10-23). Local Docker stack only; no hosted project.

## Context

- The app kept everything in `localStorage`. Clearing the browser lost every run, and nothing reached a second device.
- The schema and RLS migrations already existed, but no client used them.
- Private sync must never be confused with contributing data to community research (ADR 0002).

## Decision

- **The browser journal stays the source of truth.** Sync is an adapter (`src/sync/supabase.ts`), and React components never query the database directly.
- **Off until sign-in.** Sync is unavailable in builds without `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, including the public Pages build. Where configured, nothing leaves the device until the user signs in on that device with an email and password.
- **One sync = pull, merge, push.**
  - Pulled records merge through `mergeStates`, the same merge that reconciles browser tabs.
  - Profiles and runs upsert by id. Events insert with `ON CONFLICT (run_id, client_event_id) DO NOTHING`, so a retry or a second sync adds nothing.
  - Reads paginate past PostgREST's 1,000-row limit.
- **Explicit control.** Sync now, sign out (which keeps local data), and an auto-sync option that is off by default. The top bar shows the sync state.
- **Divergent journals.** If the same run gets different events at the same sequence on two devices, the push fails on `UNIQUE(run_id, sequence_no)`. That surfaces as a conflict message and nothing is overwritten. This is rare: one run is normally recorded on one device.
- **Research data stays separate.** Sync never writes `research_contributions`.

## Verification

`make verify-db` and the CI database job start Postgres, Auth, PostgREST and Kong, then run `src/sync/supabase.integration.test.ts` against the live API:

- profiles and runs round-trip, corrections included
- repeating a sync adds no events
- a second device merges in both directions
- another account can't read the runs or insert or update them
- even the owner can't update or delete events
- synced records survive a Postgres container restart

## Rejected

- **Anonymous auth.** Anonymous accounts can't be recovered on another device, which defeats the purpose.
- **Writing from React components.** Rejected for testability and the single-boundary rule in ADR 0001.
- **Last-write-wins on whole state.** Append-only journals can be merged without loss, so there's no reason to discard either copy.

## Later

- A hosted staging project with the same migrations needs owner approval, since it may cost money.
- Account deletion UX.
- Incremental pushes, sending only events newer than the server's highest sequence per run.
