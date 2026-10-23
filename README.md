# HordeMind — Season 15 Infernal Hordes advisor

A client-side React 18 web app for comparing Infernal Offers using a seeded Monte Carlo model.

**Live site (once Pages is enabled):** https://robroyce.github.io/hordemind/

## Architecture
- `src/catalog.js` — offering definitions and explicit known / approximate effects
- `src/engine.js` — seeded event simulator, estimated marginal Aether, diagnostic explanations and one-time War Plan opportunity-cost notice
- `src/app.js` — React interface, searchable offerings, saved runs, URL snapshot sharing, observations
- `styles.css` — responsive presentation
- `tests/engine.test.mjs` — seeded regression tests, including Hellborne spawn prerequisites and Mass-heavy decisions

## Important modeling caveats
- The Aether predictions are *estimates under uncalibrated assumptions*, not verified game yields.
- The specific Chaos Wave **cannot** be selected beforehand; only Chaotic Offering is shown. Outcome mix and yields are provisional assumptions.
- Exalted Hellborne adds +1 Aether to Hellborne kills, but does not create Hellborne. Without a spawn effect, its immediate estimated contribution can correctly be zero.
- The one-time extra War Plan offering is tracked and consumed when checked. We explicitly disclose its unquantified future opportunity cost rather than invent a probability distribution.
- Detailed future-option policy search and calibration of future offering frequencies are not yet implemented.
- Existing runs are saved in browser localStorage. Shared links encode a snapshot in the URL fragment; no database sync.
- React is loaded from esm.sh; after page load, simulations execute entirely in the browser and do not call the OpenAI API.

## Deploy
Repository Settings → Pages → Build and deployment → Deploy from a branch → `main`, `/(root)`. Every push to main then triggers GitHub Pages.
Run tests with `node tests/engine.test.mjs`. 

## Model transparency and limitations (October 2026)

This is an **experimental simulator**, not an optimized Markov decision process and not a complete implementation of every Season 15 offer. In particular:
- It uses seeded common random numbers for paired candidate-vs-baseline runs (currently 1,200 samples by default).
- It estimates incremental reward `mean(simulate(state + offer) - simulate(state))` and empirical 5–95 percentile intervals. Those percentiles represent **modeled outcome variability**, not a calibrated statistical confidence interval.
- The scenario includes a 60-second wave effort budget, Mass reform / kill cascades, Hellborne spawn prerequisites, event opportunity costs, and a random unknown Chaos Wave outcome.
- The exact event arrival process, Monster Power, spawn mechanics and payouts are uncalibrated. Many offering entries only have descriptive guidance.
- Explicitly *unmodeled* offerings are not scored as zero. The catalog can contain entries without a validated simulator mechanic.
- It does not presently model future offering arrival probabilities or solve optimal saving of The Black Pact's single special choice. Opportunity cost is flagged, not predicted.
- Run observations are saved locally but are not currently used to fit simulation parameters.
- Some War Plan node effects are taken from community guides and must be verified against the in-game tooltip before they are used as numeric coefficients.

### War Plan guide
Find the War Plans table in Temis (Skovos), then the Infernal Hordes activity tree. Active trees require unlocking War Plans through the Lord of Hatred campaign. The in-app tree names include Method and Madness, The Black Pact, Total Chaos, Bedlam, Reign in Hell, Pulse of Aether, Cult of Annihilation, Impending Doom and Council Coffers. Distinct play styles favor distinct allocations.

Helpful references:
- https://www.icy-veins.com/d4/guides/infernal-hordes-guide/
- https://www.icy-veins.com/d4/guides/war-plans-overview/
- https://consolepulse.com/multiplatform/diablo/guides/diablo-4-season-15-war-plans-guide
- https://d4guides.gg/en/guides/endgame/war-plans-best-skill-setups-for-every-activity
