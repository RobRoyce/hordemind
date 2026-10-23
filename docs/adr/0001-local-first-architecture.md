# ADR 0001 — Local-first, evidence-driven HordeMind

**Status:** Accepted for v2 foundation (2026-10-23)  
**Scope:** Architecture and development process; not an assertion that v2 is production ready.

## Context
The Season 15 prototype mixes UI, incomplete inferred game mechanics, and unverified offering probabilities. Its run inputs are not rich enough for causal learning, and a single-page experience creates unnecessary friction while playing. Branch-based GitHub Pages published before all checks completed.

## Decision
1. Build `apps/web` as a separately deployed-ready **React + TypeScript + Vite** application. Preserve the current production site until v2's acceptance tests pass.
2. Separate **domain schemas**, **event ingestion**, **mechanics catalog**, **simulation**, **recommendation policy**, **research inference**, and **presentation**. No game mechanics embedded in components.
3. Use a **local-first append-only run event log**. Every event records its schema version, a unique ID, timestamp, client version, profile snapshot reference, game patch and provenance. Sync is an optional adapter, not a prerequisite to use.
4. Store all options offered, which option was selected, whether a one-time special offer was consumed, and wave-end Aether separately. An omitted event count means **not observed**, not zero.
5. Keep private profile settings and run observations local by default. Opt-in community submissions must be specific, revocable for retained raw data, subject to validation, and patch partitioned.
6. Use Supabase Postgres when community ingestion is ready. Schema and RLS are migration-controlled. No anonymous direct `INSERT` into scientific tables.
7. Every recommendation returns `modelId`, `patch`, input assumptions, uncertainty, reason codes, and known/unknown mechanics. Never invent precise Aether gains for unsupported effects.
8. Build deployable artifacts **only from CI-verified commits**; gate Pages deployment on build, unit, deterministic simulation, accessibility checks and browser smoke tests.

## Code organization

```
apps/web/                Vite SPA; Strategy Lab / Live Run / Insights
apps/web/src/domain/     strict TypeScript contracts and event validation
apps/web/src/storage/    local adapter, later Supabase sync adapter
apps/web/src/features/   profile setup, recording, insight panels
supabase/migrations/     migration-first Postgres schema + RLS
docs/adr/                decisions and rejected alternatives
docs/research/           licenses, reproducible experiments, mechanics provenance
src/                     legacy prototype (maintained until v2 cutover)
```

Future packages are justified only when there are at least two genuine consumers; avoid premature monorepo abstractions.

## Versioning and scientific integrity

Events are versioned by `schemaVersion`, game patch, and client build SHA. An offer ID is stable **within a catalog version**; aliases and renamed offerings are resolved through a documented mapping. Observations have explicit `not_seen` / `unknown` states. Models are fitted and scored per patch and evaluated on held-out runs with calibration, regret, event completion, and uncertainty reliability metrics.

## Alternatives

- Full SQL backend from day one: rejected; adds authentication and abuse concerns before the product records meaningful data.
- Copy an existing complete planner: rejected for licensing, maintenance, and feature mismatch. Explore **import adapters**, then progressively use lawful visual data.
- Continue incremental changes in the legacy one-page app: rejected; UI and evidence pipelines are tightly coupled.
- Use one historical ranking: rejected; misses time constraints, random Chaos waves and Black Pact option cost.

## Trade-offs and next decisions

- Local-first users need explicit cloud sync/consent to contribute research data.
- Event logs require correction events rather than destructive rewrites.
- A plugin to parse external build links may need a separately hosted compliant adapter.
- Exact War Plan prerequisites and modifiers must be verified against in-game Season 15 tooltips before numeric model changes.
- ADR 0002 should define the consent, pseudonymization and deletion semantics before public ingestion.
