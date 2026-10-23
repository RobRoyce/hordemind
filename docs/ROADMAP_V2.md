# HordeMind v2 — execution roadmap

## Product north star

When actively playing, enter the 3–4 offers presented, compare explainable recommendations, make one choice, and optionally capture a wave result **without navigating a giant settings form**. Before the run, configure your character once. Afterward, learn from your own and eventually the community's observations.

## Milestones and acceptance criteria

### M0 — reliable foundation (this PR)
- [x] ADR and domain / provenance contracts
- [x] Separate TypeScript Vite application with Strategy Lab / Live Run / Insights routes
- [x] Local-first append-only run data and privacy-default consent
- [x] Supabase migration draft including owner-scoped RLS
- [x] License & import integration inventory
- [x] PR build/typecheck/test pipeline; no live-site change
- [ ] Built-app Playwright tests verified and reviewed
- [ ] Preview v2 build in isolation

**Exit:** v2 build passes CI; browser can create profile, record a full run, reload, export JSON; old site untouched.

### M1 — ergonomic gameplay
- [x] Searchable offer picker (name, family, mechanic), keyboard 1–5, recent offers first
- [x] Focus handling, 44 px targets, compact phone layout, undo with prefill, end run early
- [x] One-step start from the selected character; no configuration while playing
- [x] Choice rationale, unmodeled-offer notices, Black Pact slot marking and spend warning
- [x] Optional per-wave Aether and event counts on the offer screen ([ADR 0003](adr/0003-run-timeline-and-observations.md))
- [x] Strategy Lab autosaves; invalid fields never reach storage; unreadable saves are never overwritten
- [ ] Measured ten-wave mock run under two minutes on laptop and phone
- [ ] Offline support (service worker)

**Exit:** ten-wave mock run in under two minutes without entering settings, on laptop and phone.

### M2 — model boundary + experimental rigor
- Port legacy simulator behind typed `RecommendationEngine` interface
- Golden gameplay fixtures for mass engine, hellborne spawners, Chaos uncertainty, and one-time perk
- Benchmark / reproduce seeded paired Monte Carlo outcomes and throughput
- Distinguish unmodeled, inferred, measured and exact tooltip effects
- Future-offer policy with explicit empirical sampling assumptions

**Exit:** simulation determinism, confidence calibration tests, no unsupported +0 values; explainable per-offer decisions.

### M3 — opt-in synchronized runs
- Provision Supabase, apply migrations and RLS, Auth with clear guest/no-account mode
- Service-backed ingest endpoint, schema validation, per-user quotas and abuse controls
- Idempotent uploads, replay safe `client_event_id`, consent & deletion UX
- Data quality dashboard: completeness, patch, selection-bias exposure and duplicates

**Exit:** signed-in user syncs runs across devices, can revoke/delete raw contributions; others cannot query private runs.

### M4 — learn from community
- Backfill parser and event provenance, collection health metrics and event frequencies
- Mechanics inference with prior distributions, hierarchical pooling by build/patch
- Prediction vs outcome validation on held-out runs and change-point monitoring after patches
- Limited observational causal claims; matched comparisons or controlled experiments where feasible

**Exit:** model versions are reproducible and can be rolled back. Show evidence and uncertainty per mechanic.

### M5 — richer character imports
- First-party hand-entered profile and basic build URL metadata
- Import adapters: Maxroll / d4builds / Icy Veins after legal and feasibility reviews
- Item/skill display from permitted datasets with origin/attribution metadata
- Responsive character-sheet UI resembling gameplay structure, without copying proprietary designs/assets

**Exit:** import fixture tests and no license-ambiguous bundled assets.

## Nonfunctional requirements

- WCAG AA as target; navigable with keyboard and screen reader, mobile-first.
- Local-first support; preserve old saves; no account necessary for core gameplay.
- <100ms feedback on selecting a local offer, <2s for ordinary recommendation on typical desktop hardware (measure and tune).
- All deploys derived from one tested artifact; production changes gated.
- Privacy: no Battle.net credentials, process memory access, overlays or automation. Explicit consent before collecting gameplay observations from others.

## First experiments worth collecting

1. Mass death -> reform + companion event counters.
2. Spawn source active? Hellborne completions / wave.
3. Offered choice sets by wave / active War Plan perk.
4. Chaos type *after* selection and Aether delta.
5. Effective completion time per event type; use optional observation rather than asking players to count everything.
6. Whether special bonus was offered, selected or skipped and its later availability.
