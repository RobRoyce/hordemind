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
