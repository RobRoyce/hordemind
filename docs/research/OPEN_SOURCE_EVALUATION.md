# Reusable Diablo IV tooling — preliminary license review

**Date:** 2026-10-23. Check upstream license, latest commit, game-patch coverage, asset ownership and site terms again before integrating anything.

| Project | What to learn/reuse | Code license (reported) | Constraints |
|---|---|---|---|
| [DiabloTools/d4data](https://github.com/DiabloTools/d4data) | Game reference records, item/skill identifiers and data extraction structure | Repo reports MIT | Blizzard owns game content. Prefer attribution, minimal derived metadata and verify per asset rights. |
| [dearac/diablo4_companion](https://github.com/dearac/diablo4_companion) | React/TS build imports from Maxroll, D4Builds, Icy Veins; paragon spatial data model | MIT per README | Desktop Electron hidden-browser extractors are **not** suitable as-is for hosted web. Confirm third-party site terms before replicating. |
| [josdemmers/Diablo4Companion](https://github.com/josdemmers/Diablo4Companion) | Integration patterns, importing affixes and gear presets | MIT per README | .NET desktop overlay, not a directly reusable web UI. |
| [LeiZheng/d4-build](https://github.com/LeiZheng/d4-build) | URL->structured build adapter; respecting Maxroll copyright | MIT per README | Data from Maxroll is copyrighted; do not redistribute bundles without permission. |
| [knightli/d4planner](https://github.com/knightli/d4planner) | Editable skill graph visual structure | License not confirmed | No copying source until license verified; may be outdated. |
| [HoldMyBeer-gg/d4builder](https://github.com/HoldMyBeer-gg/d4builder) | Data validation and source provenance methodology | Complex license file; review components | Captured data is older patch (S12); do not assume S15 compatibility or unrestricted use of bundled assets. |

## Proposed profile import API

```ts
interface BuildImportAdapter {
  source: 'maxroll' | 'd4builds' | 'icyveins';
  accepts(url: URL): boolean;
  import(url: URL): Promise<{build: Partial<CharacterBuild>; sourceUrl: string; gamePatch?: string; warnings: string[]}>;
}
```

The imported data must include a source URL and extraction version, with fields individually marked as imported/observed/unknown; never silently assume imported stats match the player's current in-game character.

## Copyright and fair use posture

Blizzard's fansite guidance has conditions including restrictions around commercial use. Open-source extraction **code** is not a grant to redistribute game artwork, exact item descriptions, web-site API responses, or commercial use of assets. Use generic icons until licensed game art is confirmed. Provide attribution and takedown contact. No scraping behind logins, no bypassing anti-bot controls, and no reading Diablo's process memory.

## Immediate engineering decision

Start with a compact character silhouette / equipment-slot layout rendered with our own CSS/SVG, and import *build URLs* where permission and adapter stability permit. Full skill-tree graphics come later.
