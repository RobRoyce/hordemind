# ADR 0003 — Run timeline and Aether observation semantics

**Status:** Accepted, and confirmed in game by the owner (2026-10-23)

## Context

- v2-foundation labelled decision *k* "after wave *k*" and gave the model `totalWaves − k` remaining waves, while still recording one decision per wave.
- That is inconsistent under either reading of the game. Either the decision count is off by one, or the horizon is.
- The separate "record wave result" step stored `wave_observed{wave:k}` after decision *k*. A player could reasonably enter the total from either side of the next wave, so the reading's timing was ambiguous.

## Evidence

| Source | Claim |
|---|---|
| [Warcraft Tavern](https://www.warcrafttavern.com/d4/infernal-hordes/) | An offer is chosen before wave 1 and before each later wave. No offer follows the final wave. |
| [Maxroll](https://maxroll.gg/d4/resources/infernal-hordes) (updated for S14) | "Once you have completed each wave, you are faced with a choice." Silent on wave 1 and the final wave. |

The owner confirmed in Season 15 play that the first offer comes before wave 1 starts.

## Decision

- Decision *k* precedes wave *k*. A run of *N* waves has *N* decisions, matching the decision count v2 already records.
- The chosen offer applies from wave *k*. The model horizon is `N − k + 1`, and a Chaos offer replaces wave *k*.
- One screen per wave. The optional Aether reading on the screen for decision *k* is stored as `aether_observed{afterWave: k−1}`, together with that decision.
- The final total is entered when the run ends (`run_finished.finalAether`).
- Runs can end early as `abandoned`. `completed` requires a decision for every wave.
- `wave_observed` stays readable for legacy runs and is never written again. Analyses must treat its timing as unknown.
- `offer_chosen` records `recommendedOffer` and `modelVersion`, so model accuracy and follow rates can be measured later.
- `offer_chosen` also records `choiceSource`. It's `default` when the player recorded the pre-selected best without changing the selection, and `picked` when they chose the row themselves. Events recorded before the field existed read as `null`, so later analysis can discount accepted defaults.
- Up to five offers per screen: three regular offers, a Chaos offer, and a special offer.

## Consequences

- Timing lives in one place. `remainingWaves()` in `recommendation/model.ts` and `project()` in `domain/run.ts` would change together if in-game checks disprove it.
- Every recommendation for a run gains one wave of horizon relative to v2-foundation.
- Existing local runs keep working. Their legacy readings show without a wave label.
- Supabase migration `20261023000200` adds `aether_observed` to the `event_type` check.

## Update (2026-10-25): readings are required

- The owner made the Aether reading required. Live Run blocks recording a decision from wave 2 on until the reading is entered or marked "Missed it".
- A missed reading is saved as no reading, which already means unknown. A guess would look like a real number, so the option keeps guesses out of the data.
- The final total is required when a run completes, with the same Missed it option. It stays optional for a run ended early, which may stop mid-wave without a reading.
- Event counts stay optional.
- The schema still allows a missing `totalAether`, so earlier runs stay valid. The requirement lives in the UI.
