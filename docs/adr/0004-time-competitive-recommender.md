# ADR 0004 — Time-competitive recommender with provenance and probability-free lookahead

**Status:** Accepted (2026-10-23). Model `s15-timeflow-3.0-experimental`.

## Context

The v2 simulator drew fixed Poisson event counts per wave and gave a 60 s × speed budget that demand rarely reached. Event time therefore almost never cost anything.

- Spire offers paid without displacing anything, the opposite of the Spire concern the owner described.
- Banes such as +100% Mass health had no effect.
- Coefficients were mixed guesses with no record of where each came from.
- Black Pact and future-pick value were absent. The owner asked that they come back without invented offer probabilities.

## Decision

1. **Mechanics as data** (`recommendation/mechanics.ts`). Every value is tagged `observed` (reported from Season 15 play), `guide` (Warcraft Tavern and Maxroll agree), `disputed`, or `assumed`, with a note. Offers missing from current guides are flagged `nameConfirmed: false`.
2. **Time-competitive waves** (`recommendation/simulate.ts`).
   - Demon kills fill the progress bar, and each fill spawns an Aether Event.
   - Completing an event costs travel plus kill time, during which progress slows. A slow event therefore displaces later events.
   - Health banes multiply kill time. Separate random streams keep paired seeds aligned.
3. **Baseline: an offer with no effect.** You must take some offer each wave, so gains compare each candidate with a pick that adds stack size and nothing else. Puffing's growth from future picks is structural (one offer per wave) and appears in both arms, so it doesn't inflate unrelated picks.
4. **Sensitivity instead of fake confidence.** Each comparison is rerun with events 40% slower, 30% faster, and Aether Events spawning 40% slower. The UI says whether the best offer survives all three.
5. **Lookahead without probabilities.**
   - The synergy outlook states conditional values, for example "Makes a later Exalted Hellborne worth +28 instead of +0".
   - Black Pact advice states the premium of the Pact offer over the best regular offer as a break-even rule, and notes that guides say Pact offers match the previous pick's category.
6. **The worker gets only a `Scenario`.** A full comparison (3 offers, sensitivity, synergy, 400 paired samples, 10 waves) takes about 0.4 s.

## Alternatives rejected

- **Uniform or catalog-weighted future offer sampling** (the v1 `policy.js` approach). It produces precise-looking expected values from a distribution nobody has measured.
- **Tuning coefficients to match tier lists.** That replaces mechanism with opinion and hides the assumptions it depends on.

## Consequences

- Throughput assumptions (`fillSeconds`, event mix, completion and travel times) now drive rankings openly. They are the first targets for inference from recorded event counts.
- With no data, the model's relative ordering roughly matches community grades: Puffing, Colossal Fiends, and the Spire multipliers are strong, and Massing is weak alone. That's reassuring, but it isn't validation.
- **Banes that threaten survival are flagged, never priced** (owner decision, 2026-10-23). Only banes that cost time enter the estimate. Each offer's documented bane carries a danger reading in `catalog.ts`: *high* for hazards aimed at the player, *some* for more incoming damage. The UI shows a badge and warns when the best offer is high danger. Dying carries no penalty in the owner's experience, so there is no revive-limit warning either.
- **A review pass (2026-10-23) fixed several bugs.** Synergy arms now hold equal stack sizes. Colossal converts every Fiend. The Pact is not priced against unmodeled offers. Loss wording follows the cause. Net-negative offers lead with the loss. Spawn-on-death events cost no travel.
- When recorded runs show which offers appear (`offers_presented` keeps every choice set), the Pact and synergy analyses can graduate to expected values estimated from that evidence, with the sample size shown.
