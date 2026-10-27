# HordeMind: learn from your runs

- **Status:** approved by the owner, 2026-10-26
- **Owner:** Rob Royce
- **Follow-up:** spec 2, the War Plan advisor, builds on the profile fields and measurements here.

## Goal

Use a player's recorded runs to fit the model to them, and show how well the model predicts their Aether.

Success means three things:
- Once a character has a few runs with Aether readings, calibrated estimates explain that character's per-wave gains better than the bucket settings do, scored on runs held out of the fit.
- The player can see how often the model's range holds their actual gain, and where it misses.
- Runs recorded from now on store the active splinter and the Lair Bosses War Plan nodes that spec 2 needs.

## Non-goals

- The War Plan advisor (spec 2)
- Measuring Aether from Doomsayers, Scale of Tathamet, Devil's Deal or Pulse of Aether (spec 2, where the advisor needs it)
- Fitting offer effect sizes other than Mass health
- New run inputs for Doomsayers, Devil's Deal completions, Varshan sightings or Belial's ambush
- Uploading anything, or any change to community research

## Decisions

| Topic | Decision |
|---|---|
| Feature order | Learn from your runs first, then the advisor. The owner chose "measure first". |
| Effects without Aether | Estimates count Aether only. Belial's ambush, Varshan, extra Monster Power and unique drops are flagged and never priced. |
| Splinter bonuses | A bonus applies only while its splinter is active. One splinter is active at a time. The app stores only the active splinter and its rank (owner, 2026-10-26). |
| Varshan's Chaos Wave Aether | Unknown. It's flagged, and Insights compares Chaos Wave gains with and without the node. |
| Calibration switch | Turns on automatically when the fit clearly beats the bucket settings on held-out runs. Live Run shows a "Calibrated" marker, and each character has an off switch. |
| Fit method | Grid search over two player numbers per character, then two game numbers pooled across characters |
| Fitted numbers | Derived data, cached in the browser, never synced |
| Scoring | The current model replays every run. Calibrated scores use leave-one-run-out. |

## Game facts

Source: DiabloTools/d4data at commit `76b722a3`, build 3.2.3.73883, which matches Season 15. The owner confirmed splinter activation on 2026-10-26.

### Season 15 splinters

- Season 15 has three splinters: Terror, Destruction and Hatred.
- One splinter is active at a time. Right-clicking another splinter makes it active.
- Each splinter has its own rank track with 24 levels (`base/meta/Reputation/S15_Triad_Reputation_Triad{A,B,C}.rep`). Ranks rise in any order.
- A War Plan bonus tied to a splinter applies only while that splinter is active.

Bonuses that touch an Infernal Hordes run:

| Splinter | Rank | War Plan node | Where the node sits | Bonus |
|---|---|---|---|---|
| Terror | 5 | Cult of Annihilation | Infernal Hordes tree, first node of the events branch | A Doomsayer appears at the start of each wave |
| Terror | 14 | Impending Doom | Infernal Hordes tree, second row of the offers branch | Impending Doom also triggers with 30 s left |
| Terror | 20 | Council Coffers | Infernal Hordes tree, second node of the rewards branch | The Chest of Talismans costs 1 Aether |
| Destruction | 14 | Lair of Runes | Lair Bosses tree, next to the root | Lair Bosses drop additional Runes |
| Destruction | 20 | Exotic Armory | Lair Bosses tree, three steps from the root | Hoard Chests drop 3 more uniques for any class |

Hatred has no Infernal Hordes bonus. Its bonuses act in Nightmare Dungeons, the Pit and Whispers. Bonuses that act outside a Hordes run are left out.

### Lair Bosses War Plan nodes that touch a Hordes run

Tree layout source: `base/meta/SkillKit/Warplans_BossLair.skl`.

| Node | Where in the Lair Bosses tree | Effect on a Hordes run |
|---|---|---|
| Varshan's Vengeance | next to the root | Varshan and his minions can appear in a Chaos Wave |
| Blood of Bartuc | past Varshan's Vengeance | The Fell Council gets +1 Monster Power. The Spoils of Greater Equipment can drop Bartuc's uniques. |
| Infernal Deception | past Nemesis Tides, which sits next to the root | Belial can ambush you after the run |
| Exotic Armory | three steps from the root | Hoard Chests, Belial's included, drop 1 more unique for any class |
| Lair of Runes | next to the root | Lair Bosses, Belial included, get +1 Monster Power and drop more Runes |
| Lair of Plenty | past Lair of Runes | Lair Bosses get +1 Monster Power. The extra Hoard Chest excludes Belial. |

The tree's other eleven nodes act in Helltides, the Pit, Nightmare Dungeons or the Lairs themselves.

## 1. Profile changes

### Schema

New `CharacterProfileSchema` fields:

| Field | Type | Default |
|---|---|---|
| `activeSplinter` | `'terror' \| 'destruction' \| 'hatred' \| null` | `null` |
| `splinterRank` | the active splinter's rank, an integer 0–24, or `null` | `null` |
| `lairBossNodes` | array of the six node names above | `[]` |

- Old data stays readable. Before this change, `splinterRank` was always Terror's rank. A parsed profile with no `activeSplinter` key and a numeric `splinterRank` therefore gets `activeSplinter:'terror'`. An explicit `activeSplinter`, including `null`, is never changed.
- The same parsing applies to the profile snapshot inside `run_started`, so old runs replay with Terror active at their recorded rank.
- `profile_schema_version` stays 1. The fields are additive JSON with defaults, and the Postgres check requires version 1.
- Private sync stores the profile as one `jsonb` value, so no database migration is needed.

### Character screen

- **Splinter block.** It sits in the character settings, after Mobility, and replaces the "Splinter of Terror rank" field that sat under the Infernal Hordes War Plan tree (owner, 2026-10-26).
  - A selector picks the active splinter from Terror, Destruction and Hatred. Nothing is selected until the player picks one.
  - One "Splinter rank" field takes 0–24 for the active splinter. An empty field means not set. The field appears once a splinter is picked.
  - Below the selector and the field, only the active splinter's Hordes bonuses are listed, from the table above, with each node's location. Each bonus shows one of three states: in effect, needs its node learned, or rank not reached. Council Coffers sits in the rewards branch, which the app doesn't track, so it never shows the needs-its-node state.
  - With Hatred active, one line says it has no Infernal Hordes bonus.
- **Lair Bosses block.** It sits below the Infernal Hordes tree.
  - Heading "Lair Bosses War Plan". The lead names where to learn the nodes, "War Plans table in Temis, Skovos → Activities → Lair Bosses", and says only nodes that change a Hordes run are listed.
  - Six checkboxes, each showing the node's location and its effect from the table above
  - No tree drawing and no prerequisite checks

### Model

- A helper `terrorRank(profile)` returns `splinterRank` when Terror is active and 0 otherwise. It replaces the `splinterRank` reads in `simulate.ts` and `model.ts`.
- The rank-14 Impending Doom trigger stays modeled as today.
- The rank-5 Doomsayer stays unmodeled and gets a note. The rank-20 chest gets a rewards note.
- Lair Bosses nodes change no estimate. Their notes appear on the Character screen. Varshan's note says his Chaos Wave Aether is unknown and gets compared in Insights.
- Live Run doesn't change in this section.

## 2. Replay

New module `recommendation/replay.ts`. The report card, the override tracker and calibration all use it.

### Readings

- The replay reads events through `effectiveEvents(run)`, so corrections apply.
- The offer chosen before wave *w* is active from wave *w* on.
- A reading is the cumulative total from `aether_observed.afterWave`. For completed runs, `run_finished.finalAether` also counts, as the reading after the last wave.
- A span is the waves between two consecutive readings. Its actual gain is the later total minus the earlier one. The total before wave 1 is 0.
- A missed reading (`totalAether: null`) merges its span with the next one.
- A total lower than the previous total is skipped and counted as a falling total.
- Legacy `wave_observed` events are skipped because their timing is ambiguous.

### Runs left out

Some War Plan nodes add Aether the replay can't place. Runs whose snapshot has any of these nodes are left out of fitting and scoring. Insights says how many runs it left out, and why.

| Node | Where it sits | Why its Aether can't be placed |
|---|---|---|
| Pulse of Aether | Infernal Hordes tree, third row of the offers branch | Pays +50 for each suppressed Chaos Wave, and suppressions aren't visible |
| Cult of Annihilation | first node of the events branch | Doomsayer Aether is unpublished |
| Scale of Tathamet | second node of the events branch | How its kills credit Aether is unknown |
| Devil's Deal | third node of the events branch | Pays +200 only when its challenge is completed, which isn't recorded |

- In runs with Varshan's Vengeance, readings whose span contains a Chaos Wave are left out.
- Bedlam's +50 for entering a Chaos Wave is already simulated, so Bedlam runs stay in.

### Simulation

- The replay simulates the whole recorded run S times, because unfinished events carry from one wave into the next (`leftover` in `simulateWaveDetailed`). S is 150–200, set by the benchmark.
- Seeds derive from the run id, so results are repeatable.
- It uses the `run_started` profile snapshot. The fit can override the player numbers and game numbers.
- Offers the model doesn't know count toward stack size only, as in today's estimates.
- For each span it records the simulated mean, the standard deviation (with a floor of 10 Aether) and the 10th and 90th percentiles.

## 3. Calibration

### Player numbers

These two are fitted per character:

| Number | Today | Fitted range |
|---|---|---|
| Kill speed (`clearTime` multiplier) | bucket: fast 0.7, average 1, slow 1.5 | 0.5–1.8 |
| Travel time between event points | bucket: high 1.2 s, average 2.5 s, low 4.5 s | 0.8–5.0 s |

- The fit uses a coarse 6 × 5 grid, then a 3 × 3 grid at half spacing around the best point. The benchmark sets the final sizes.
- Each reading's score is the log density of a Student-t distribution with 4 degrees of freedom, centred on the span's simulated mean and scaled by its standard deviation. A run's score is the sum over its readings, and the fit maximizes the total over runs.
- It uses the character's most recent 30 runs that have at least 3 scored readings. When the character's difficulty is anything but Unknown, it uses only runs at that difficulty.
- An `unknown` bucket counts as average when it's compared with the fit.

### Game numbers

These are fitted after the player numbers, holding each character at its own fit, and pooled across all characters:

| Number | Today | Fitted values | Runs used |
|---|---|---|---|
| Mass health | The Massing Masses doubles Mass kill time. It's a Masses-family offer whose bane reads "Masses health is greatly increased". | 1, 1.25, 1.5, 2, 2.5, 3 | Runs with The Massing Masses active |
| Event spawn rate (`fillScale`) | 1 | 0.6–1.6 in 6 steps | All runs |

Event spawn rate and pace look alike in totals. The switch-on rule keeps it off unless event counts or a second character separate them.

### Switching on

Each fitted number switches on when two conditions hold:
- At least 3 qualifying runs exist.
- The held-out score with the fitted value beats the held-out score with today's value by at least 3 log units.

Held-out scores use leave-one-run-out. The fit keeps every run's score at each grid point, so the best point without run *i* is the best of (total − run *i*'s score). That costs no extra simulation.

### Use

- While calibration is on, the fitted numbers replace the bucket values and the game guesses in every estimate.
- `CharacterProfileSchema` gains `useCalibration`, a boolean that defaults to `true`. The character form shows it as a "Use calibration" switch.
- `PlayerProfile` gains optional `clearTime` and `travel` overrides. `Assumptions` gains `massHealth` next to `fillScale`.
- The recorded `modelVersion` gains a `+calibrated` suffix.
- Turning off "Use calibration" returns that character to the buckets and the game guesses.

### Storage and recompute

- Fitted numbers are cached in browser storage, outside the synced state. They're never added to the profile and never synced.
- The cache key combines the profile id, the qualifying runs and their event counts, and `RECOMMENDER_VERSION`. A new model version clears it.
- The fit reruns in the background worker when:
  - a run ends
  - a correction is added
  - synced runs arrive
  - the character's difficulty changes
- Until a fit is ready, estimates use the buckets.
- Budget: about 10 seconds for 30 runs on the owner's machine.

## 4. Report card

- Each scored reading counts once, even when its span covers several waves.
- **Range rate** is the share of readings whose actual gain falls between the simulated 10th and 90th percentiles. The target is 80%.
- **Average miss** is the simulated mean minus the actual gain, averaged over readings. The screen phrases it in words, such as "predicts 48 too much per reading".
- Two rows compare the buckets with calibration. The calibrated row uses held-out scores, and it appears only once a fit exists.
- **By family.** Readings are grouped by the family of the offer taken before the span's first wave. Groups with at least 5 readings show their own range rate and average miss.
- The report card scores the current model. It doesn't score the versions that made the original recommendations.

## 5. Override tracker

It reads recorded choices that have both `recommendedOffer` and `choiceSource`. Older choices are skipped.

| Group | Rule |
|---|---|
| Took the pre-selected pick | `choiceSource === 'default'` |
| Picked it yourself | `choiceSource === 'picked'` and the chosen offer is the recommendation |
| Took another offer | the chosen offer isn't the recommendation |

For "took another offer", the tracker shows three things:
- **Model's predicted cost.** It replays the decision with `compareRun` under the current model and the run's snapshot, using calibration when it's on, and takes the recommendation's mean minus the chosen offer's mean. The total and the average are shown.
- **Forecast versus actual.** This is the mean of actual minus simulated gain for spans that start after the override. Runs left out of scoring (section 2) are skipped here.
- **Most picked against.** These are the three offers most often taken over the recommendation, and the three recommendations most often skipped.

The tracker's copy treats overrides as disagreements to learn from, not mistakes.

## 6. Game-number counts

These are plain counts with no model. Each shows its sample size.

| Count | Definition | Split |
|---|---|---|
| Offer frequency | Appearances of each offer divided by offer sets | Reign in Hell, Total Chaos, neither |
| Category repeats | Share of offer sets, after the first, with at least one offer in the previous pick's family | With and without Method and Madness, the first node of the offers branch |
| Chaotic Offering rate | Share of offer sets that include The Chaotic Offering | With Total Chaos and with neither. Runs with Reign in Hell are excluded, because it suppresses Chaos Waves. |
| Varshan | Median Chaos Wave span gain | With and without Varshan's Vengeance |

## 7. Screens

### Insights

Four new sections go above Run history:

```
Insights
Your runs, kept on this device.
12 runs, 104 recorded choices, 9 waves with event counts.

Model fit · Blessed Shield
  Calibration is on. Your waves yield 12% more than your buckets predict.  [Details]

Report card
  Your gain landed inside the 80% range in 64% of 120 readings (target 80%).
                     Your buckets   Calibrated
  Inside the range   58%            71%
  Average miss       +48            +6
  After Mass offers (14 readings): model over-predicts by 60

Your choices
  Took the pre-selected pick 61 · Picked it yourself 9 · Took another offer 14
  The model estimates your other picks cost about 120 Aether.
  After those picks you beat its forecast by 22 per wave.

Game numbers · all characters
  Chaotic Offering appeared in 18% of 140 offer sets.
  Mass health fitted at 1.6× (guess 2×). In use.
  Event spawn rate needs event counts to measure.

Run history (unchanged), Sync, Research note
```

- Mockup numbers are illustrative.
- Model fit, Report card and Your choices cover the active character. Game numbers pool all characters.
- Model fit leads with the combined effect. Its details show both player numbers next to the bucket values.
- Every section has an empty state that names what's missing, such as "Record 2 more runs with Aether readings to see the report card."
- A section shows how many runs it left out, and why.
- On phones, tables stack into rows.

### Live Run and estimate details

- A "Calibrated" marker sits beside the recommendations while calibration is on, and it opens the fitted numbers.
- Estimate details label each fitted number "from your runs", alongside the existing provenance labels.

## 8. Privacy

- Every calculation runs in the browser, in the existing worker. Nothing is uploaded.
- Private sync keeps syncing profiles and runs exactly as today, and only when the player turned it on. Fitted numbers never sync.
- Community research consent is untouched. None of this analysis goes to research.

## 9. Failure handling

| Case | Behavior |
|---|---|
| Falling total | Reading skipped and counted in the section's note |
| Unknown offer | Counts toward stack size only |
| Legacy `wave_observed` | Skipped |
| Run with an unplaceable Aether node | Left out of fitting and scoring, and counted |
| Worker error | The section shows the error and a retry button. Live Run uses the buckets. |
| New model version | Cached fit cleared |

## 10. Testing

- **Fit recovery.** Synthetic runs generated by the simulator at known settings, such as kill speed 0.85 and travel 2.0 s, must fit near those settings. Runs generated at bucket values must leave calibration off.
- **Unit tests** (Vitest):
  - replay spans, covering missed readings, corrections, falling totals and legacy events
  - the runs-left-out rules
  - leave-one-run-out selection
  - the switch-on rule
  - the three override groups
  - the four counts
  - giving legacy profiles and run snapshots an active Terror splinter
  - `terrorRank` gating
- **End-to-end tests** (`tests/e2e.mjs`):
  - The splinter block and the Lair Bosses checkboxes save and reload.
  - Insights renders all four sections from seeded runs.
  - The "Calibrated" marker appears with qualifying runs and goes away when the switch is off.
- **Benchmark.** A script times the fit on 30 synthetic runs against the 10-second budget.
- The owner sees each UI change on 127.0.0.1 before its PR.

## 11. Delivery

Three PRs, in this order:

1. Profile changes (section 1)
2. Replay, report card, override tracker and counts (sections 2, 4, 5, 6 and their Insights sections). These show how accurate the model is before anything changes recommendations.
3. Calibration (section 3), the Model fit section and the Live Run marker

Each PR updates `docs/UX_V2.md`, `docs/ROADMAP_V2.md` and the README where they describe the affected screens.

## Open points for the owner

- Resolved: the splinter rank maximum is 24. Each track lists 24 rank thresholds, and their rewards line up with the War Plan bonuses at ranks 5, 14 and 20 (Hordes), 4, 12 and 18 (Helltide) and 8 and 22 (Whispers).
- Runs with Pulse of Aether or any events-branch node are left out of fitting and scoring. A player who always runs one of those nodes gets no calibration until spec 2 measures their Aether.
