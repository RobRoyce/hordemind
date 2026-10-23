# HordeMind — Infernal Hordes Season 15

A free, open-source, persistent web app for Diablo IV Infernal Offer decisions. No API keys or ChatGPT credits are needed.

**Live:** https://robroyce.github.io/hordemind/

## How to use

1. Set your run length, wave, kill speed, and the Infernal Hordes War Plan nodes you actually have.
2. Add previous offers (search by name or effect).
3. Enter the three offers on your screen, plus a Chaos / special fourth option if present.
4. Enable the experimental future-offer lookahead if you want hypothetical long-term synergy analysis.
5. Compare predicted additional Burning Aether and read the exact reasoning, assumptions, warnings, and event contributions.
6. Choose the offer and keep playing. Runs are saved in browser storage. Share Run generates a link encoding your current setup.
7. Optionally record cumulative wave-end Aether and previous offers for coarse yield calibration.

The one-time Black Pact extra choice is tracked; a scenario tool estimates future opportunity cost without pretending future offering probabilities are known.

## Modules

- `src/catalog.js` — names, effects, metadata, uncertain and unsupported offer catalog entries
- `src/engine.js` — seeded, 60-second wave-by-wave Monte Carlo simulation
- `src/policy.js` — future offer draws, receding-horizon scenarios, and one-time Black Pact stopping approximation
- `src/warplans.js` — named activity-tree nodes and mutually exclusive paths
- `src/strategy.js` — synergy archetypes, contextual advice and perk recommendations
- `src/calibration.js` — cautious total-Aether based rescaling (not causal learning)
- `src/worker.js` — worker-thread simulation so offer selection remains responsive
- `src/app.js`, `styles.css` — responsive React interface and styling
- `tests/` — regression tests and Playwright browser smoke test

## Scientific honesty

The modeled future probabilities and many offer payout/throughput assumptions are **not experimentally verified**. This is an experimental decision aid—not guaranteed-optimal gameplay advice. We deliberately label unsupported mechanics instead of displaying them as +0 Aether. The 5–95% bands are scenario ranges, not confidence intervals.

See [MODEL.md](docs/MODEL.md) for formulas, references, exact limitations and validation roadmap.

## Deploy

GitHub Pages deploys from the repository `main` branch root, and each push triggers a deployment. The React client is loaded as browser modules using a pinned esm.sh import map. Simulations run locally in a Web Worker.

To run unit tests locally on Node 22+: `node tests/engine.test.mjs && node tests/policy.test.mjs && node tests/calibration.test.mjs`.

The browser smoke workflow runs headless Chromium against a local HTTP server and verifies selection, comparison and sharing.

No paid services, backend, accounts or subscription credentials are involved.
