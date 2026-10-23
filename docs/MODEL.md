# HordeMind model specification (experimental)

## Scope and source of truth

HordeMind estimates the marginal Burning Aether value of **choosing an Infernal Offer now** in Diablo IV Season 15. Tooltips in the current game client take precedence over community guides when sources disagree.

References:
- [Icy Veins Season 15](https://www.icy-veins.com/d4/guides/infernal-hordes-guide/)
- [Maxroll Infernal Hordes](https://maxroll.gg/d4/resources/infernal-hordes)
- [Blizzard Season 10 revamp notes / patch summary](https://www.icy-veins.com/d4/news/why-chaos-waves-needed-a-nerf-in-diablo-4-season-10/)
- [Current War Plans reference](https://consolepulse.com/multiplatform/diablo/guides/diablo-4-season-15-war-plans-guide)
- [Wowhead older Mass descriptions](https://www.wowhead.com/diablo-4/guide/infernal-hordes)

**This is not a reverse-engineered copy of Blizzard's hidden event scheduler.** It is a stochastic *surrogate* to compare choices under explicit gameplay assumptions.

## Verified or publicly documented formulas

- Base Mass reward: 3 Aether.
- Base Fiend reward: 4 Aether.
- Base Spire reward: 5 Aether.
- `Puffing Masses` bonus: +1 Aether per previously selected offering, with Mass-category offerings counted twice.
- `Massing Masses`: independent reform probability 30% per destruction. Idealized expected Mass completions per initial Mass, if no time limit and no interdependence: `1/(1-0.30)=1.4286`.
- `Teeming`, `Hellish`, and `Anchored`: 50% probability of a corresponding event per Mass destruction (see conflicting target notes below).
- `Bursting Masses`: configurable two starting Masses per offering per wave; some guides describe one, so verify in-game.
- `Burning Hellborne`: modeled +2 Aether per Hellborne kill, plus an approximate Hellfire spawn route.
- `Exalted Hellborne`: modeled +1 Aether per Hellborne kill and **does not create Hellborne**.

The Teeming Masses target is disputed in guide versions (Fiend vs. Lord). Choose whichever your S15 game tooltip says in Advanced Assumptions. The other sources and inferred interactions are not declared exact if unverified.

## Forward simulation

For each wave `w`, initialize independent seeded stochastic event pools:

```
BaseMasses ~ Poisson(lambdaMass)
BaseFiends ~ Poisson(lambdaFiend)
BaseSpires ~ Poisson(lambdaSpire)
AdditionalMasses = BurstingCount * BurstingSelections
```

Then process Masses, Fiends, Hellborne, Lords and Spires within a bounded 60-second effort budget. The relevant chosen offers determine reward per event and probabilities of child events. Mass reforms may recur, but the model caps the cascade and charges event completion time.

All waves are simulated separately and future choices only activate in the wave after they are selected. The event-processing priority is a **heuristic**; human play may prioritize differently.

A chosen Chaos offering replaces that wave with a randomly sampled Chaos outcome. The future outcome is unknown at selection time. Outcome weights and payout intervals in `src/catalog.js` are **illustrative parameters**, not verified odds or guaranteed rewards.

## Marginal value (standard)

For each candidate `o` and a shared seed `z_i`:

```
Delta_i(o) = R(state + o, z_i) - R(state, z_i)
EstimatedGain(o) = average(Delta_i(o))
```

The paired seeds reduce random noise, but cannot eliminate errors in the underlying event model. The displayed 5th and 95th percentiles represent sampled outcome variability, **not a statistical confidence interval** or a guarantee.

## Future choice lookahead (optional)

In the lookahead mode, HordeMind samples synthetic future choice sets. A greedy receding-horizon policy picks the offering with greatest estimated downstream marginal reward at each future wave. Each current candidate is evaluated against a separately optimized baseline policy using comparable seeded scenarios. Default horizon: 2 future waves; other subsequent waves are held without new modeled selections.

War Plan effects enter **only this hypothetical choice generator**, not as assumed actual game odds:

- `Method and Madness`: multiplies probability weight for offers in the latest selection's category (configurable bias).
- `Reign in Hell`: no Chaos choices; approximates one additional regular option.
- `Total Chaos`: approximates one fewer regular choice and additional Chaos probability weight.
- `The Black Pact`: a one-time category-matching extra offering. Its future value is estimated using a finite-horizon stopping approximation (no perfect foreknowledge).
- `Bedlam`: +50 modeled on entering a Chaos Wave; other unverified conditional perks remain notes.

These probabilities are **synthetic planning assumptions**; use scenario sensitivity before trusting close rankings.

## Calibration from recorded Aether

Two or more cumulative wave-end Aether totals plus a compatible prior-offer history allow **coarse global yield rescaling**:

```
ratio = average(actual cumulative Aether / modeled cumulative Aether)
strength = min(0.7, 0.18 * observations)
scale = clamp(1 + strength * (ratio - 1), 0.5, 3)
```

This changes the **numerical** estimate, *not* the ordering. Total Aether does not identify event types, spawn odds, the probability of future offers, or the causal effect of any modifier. Fine-grained calibration will require event counts (manual or video-derived), more runs and held-out validation.

## Engineering and reproducibility

- Client-side React interface `src/app.js` and Web Worker `src/worker.js`.
- Independent catalog `src/catalog.js`, simulation `src/engine.js`, lookahead `src/policy.js`, calibration `src/calibration.js` and War Plans `src/warplans.js`.
- PR / push CI: syntax checks, deterministic unit tests, seeded behavioral tests, headless Chromium smoke test for offer selection, comparison, and shareable URL.
- No OpenAI API calls, subscription credits, analytics or backend database.
- Browser localStorage persists personal runs. Share links encode run snapshots in a URL fragment. They are not synchronized across your devices.

## Highest-priority research gaps

1. Verify *all* Season 15 boon/bane numbers and stacking restrictions against game tooltips, including the correct target of Teeming Masses.
2. Determine empirical offering frequency by rarity / prior category / Method and Madness / Chaos War Plans.
3. Capture event types, completions and per-wave Aether, not just totals; calibrate spawn and clear-rate parameters against held-out runs.
4. Estimate character-specific effective completion times and danger/death loss.
5. Increase planning depth only after future offer distributions have been measured.
