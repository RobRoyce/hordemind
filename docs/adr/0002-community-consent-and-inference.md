# ADR 0002 — Research consent, provenance and defensible mechanics inference

**Status:** Proposed. Must be accepted before enabling any public collection API.

## What we collect and why

Each eligible decision should preserve `all_offered_options`, `chosen_option`, `special_slot_index`, `wave_number`, `Aether_before/after` when observed, active War Plan config, character clear-speed descriptors, game patch, model version, and timestamps. Optional counts of Mass, Hellborne, Fiend, Lord and Spire completions improve identification of trigger probabilities. A recording can mark any observation **unknown**. Do not synthesize zeros for missing data.

## Privacy defaults

- The v2 foundation records locally only. It does not upload, authenticate or share raw runs.
- Community contributions will require an explicit opt-in **separate from using the app**, with a clear list of fields transferred. Refusing will not disable gameplay.
- Pseudonymous account ID only; never request Battle.net login, real name, email as gameplay telemetry, or access to game-process memory.
- Support export and deletion. Withdrawing removes retained raw contributions; aggregate model weights that already incorporated samples cannot necessarily be reversed immediately, which must be disclosed.
- Avoid publishing raw records that can link to named build URLs or identifiable gaming handles.
- Store only game version and opt-in technical context necessary for deduplication and data quality; no cross-site tracking.

## Data validation and causal inference

1. Raw append-only client events: validate schema, monotonic sequence, valid `chosenIndex`, no double-spent bonus, dedup by client event ID, and patch consistency.
2. Derived facts: materialize usable wave decisions from corrections. Group by `patch` and `offerCatalogVersion`. Mark reliability / completeness per run and observation.
3. Estimation: begin with Bayesian binomial / Poisson posteriors for mechanical triggers and event spawn counts, with hierarchical effects for build / difficulty when evidence supports them.
4. Selection bias: preserve the complete presented choice set, run stage and chosen item. Estimate offering appearance frequencies separately from rewards; don't infer offering effectiveness by averaging self-selected players' totals.
5. Validation: hold out entire players/runs across train/test splits, compare predicted vs actual Aether and interval coverage; report confidence and version.
6. Abuse resistance: server-side schema validation, ingestion quotas, idempotence, impossible-event checks and reputation signals. Do not block valid unusual runs solely for statistical outlier status.
7. Patch discontinuity: detect balance patches, stop pooling across incompatible versions, backtest and version rollback.
8. Research transparency: publish aggregate methods and uncertainty, not raw identifying sessions.

## Security

Use authenticated Supabase client with Postgres RLS for owner data. A server-side submission service with a narrowly scoped service role will be required for research aggregation; **never** put the service-role key in browser bundles. Apply RLS tests in staging before public launch. Rate-limit ingestion and keep audit logs.

## Non-goals

Reading game memory, automating gameplay, bypassing anti-cheat, publishing proprietary assets, or treating scraped planner data as authoritative evidence about a user's current character.

## Open question

Decide whether to allow anonymous one-shot signed submissions. Initial recommendation: require authentication for research contributions; guest mode remains fully functional without uploads.
