# HordeMind

**Diablo IV · Season 15 · Community-driven Infernal Hordes intelligence**

**Website:** https://robroyce.github.io/hordemind/

HordeMind is an open-source project for recording Infernal Hordes decisions and ultimately learning their mechanics from opt-in player observations. The v2 application separates setup, gameplay and analysis.

## Current application

- **Strategy Lab:** character profiles that save as you edit. Covers class, realm, difficulty up to Torment XII, clear speed, mobility, a build-planner bookmark, and War Plan nodes. Selecting The Black Pact enables the one-use special offer.
- **Live Run:** one screen per wave. Search the offers on your screen by name or mechanic, see a ranked recommendation, and record your choice by click or keyboard. An optional Aether reading for the previous wave goes on the same screen. Includes undo with prefill, end run early, and a Black Pact slot marker.
- **Insights:** run history and a JSON export of the full append-only journal.
- Everything is saved **in your browser**. Optional **private sync** copies runs to your own account on a local Supabase server (`make up`, then Insights → Private sync). Nothing is shared for research.

**About the recommender:** each wave is a 60-second time budget in which slow events (Soulspires, high-health banes) displace other events. Every mechanic value is tagged as guide-backed, disputed, or assumed. Each recommendation reports whether it survives other timing assumptions and what a pick unlocks later. Black Pact advice is a break-even rule, not an invented probability. None of it is calibrated against recorded runs yet. See [ADR 0004](docs/adr/0004-time-competitive-recommender.md) and the [model notes](docs/MODEL.md).

## Run locally (free)

Prerequisites: Node.js 22+. For the optional local database, a Docker-compatible runtime (Docker Desktop or OrbStack). The Supabase CLI is fetched at the CI-pinned version if not installed.

```bash
git clone https://github.com/RobRoyce/hordemind.git
cd hordemind

make up    # optional: Dockerized PostgreSQL, local Supabase Auth and Studio
make dev   # Vite dev server; installs pinned npm dependencies on first run
```

Open http://127.0.0.1:5173. Local Postgres is on 127.0.0.1:54322 and Studio is http://127.0.0.1:54323. No hosted Supabase account is needed. `make up` also points the dev app at the local API, so private sync works locally.

Before pushing changes, run the full verification **locally**:

```bash
make verify       # TypeScript + unit tests + production build + browser
make verify-db    # Same checks plus Docker/Postgres/RLS integration
make verify-fast  # Skip browser when iterating on domain-only code
```

GitHub Actions remains the final release safety net, not our inner debugging loop.

See [local development instructions](docs/LOCAL_DEVELOPMENT.md) for database migrations, resetting, and generated types.

## Architecture

- `apps/web` — React/TypeScript/Vite UI and versioned local event journal
- `supabase/migrations` — PostgreSQL schema with private RLS and append-only run events
- `supabase/tests` — real Postgres authorization and security regression tests
- `docs/adr` — architecture and privacy decisions
- `docs/ROADMAP_V2.md` — development milestones
- `src/` — archived experimental v1 simulation source, retained for migration and reference

## Quality and deployment

All `main` deployments are built from a pinned npm lockfile and gated on TypeScript, unit tests, a Chromium/Chrome production-build smoke test, and Dockerized PostgreSQL/RLS integration tests. GitHub Actions deploys the validated artifact to GitHub Pages and performs an HTTPS smoke check of the published files.

## Research ethics

Participation will remain optional, and collecting community contributions is not yet enabled. We preserve all presented choices (not just selections) for later probability inference, make model assumptions visible, and distinguish unknown measurements from zero. No Battle.net credentials or game memory access.

See [roadmap](docs/ROADMAP_V2.md), [GitHub issues](https://github.com/RobRoyce/hordemind/issues), and [architecture decisions](docs/adr/0001-local-first-architecture.md).

## Found something wrong?

If an offer, War Plan upgrade, number or explanation doesn't match the game, please [open an issue](https://github.com/RobRoyce/hordemind/issues/new/choose). Every estimate and War Plan tooltip in the app has a **Report it** link that fills in the form for you. In-game evidence, such as tooltip text, a screenshot or what happened in your run, is the most useful thing to include.

## Game data

Offer and War Plan names and effect text are Blizzard Entertainment's, quoted from the Diablo IV client via [DiabloTools/d4data](https://github.com/DiabloTools/d4data) for reference. HordeMind is a fan project, not affiliated with Blizzard.
