# HordeMind v2 — foundation (preview, not production)

React + strict TypeScript + Vite. This **does not replace** the current GitHub Pages site until review and full CI gates.

- `npm install`
- `npm run dev`
- `npm run typecheck && npm run test && npm run build`

Includes initial Strategy Lab, fast Live Run recorder, Insights/export, append-only local event log, and privacy-default data model. The recommendation model is **not yet ported** into this app; the live legacy advisor remains available at the root URL. No credentials, auth, or cloud writes.

See `../../docs/adr/0001-local-first-architecture.md`, `../../docs/ROADMAP_V2.md`, `../../docs/UX_V2.md`.
