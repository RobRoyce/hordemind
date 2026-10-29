# Visual upgrade: War Plan trees and the fan chart

Status: draft for owner review, 2026-10-28.

Mockups (throwaway, in the job's scratch folder):
- `tmp/mockups/trees.html` shows both War Plans in the game layout.
- `tmp/mockups/upgrade.html` shows the node look and the fan chart.

## Goal

- Make the War Plan trees on the Character screen look and behave like the trees at the War Plans table in Temis.
- Draw the Lair Bosses War Plan as a tree instead of a checklist.
- Replace the Wave by wave bar chart on Insights with a fan chart that reads at a glance.

## Non-goals

- Changing what the model computes. The trees only change how nodes are drawn and chosen. The six Lair Bosses nodes that change a Hordes run stay the only ones the model reads.
- Using Blizzard art.
- Adding an animation library. CSS and a few lines of SVG handle the motion.
- War Plans for other activities, such as Helltide or the Pit.

## Owner decisions (2026-10-28)

| Topic | Decision |
|---|---|
| Approach | Keep our tree engine. Add libraries only where they save real work. |
| Node look | Bevelled gold rim, ember core and glow when learned, lit connectors, light-up animation |
| Icons | Game Icons (game-icons.net) via `react-icons`, with a credit line |
| Trees | Draw all of both War Plans, Rewards included |
| Desktop layout | The game's own layout: one tree per War Plan, root at top centre |
| Phone layout | The same tree scaled to fit, icons only, details on tap |
| Fan chart | One fan from the start of the run |

## 1. War Plan data from the game files

### Source

- DiabloTools/d4data at the commit `make game-text` pins (`76b722a…`).
- **Layout.** `json/base/meta/SkillKit/Warplans_InfernalHordes.skl.json` and `Warplans_BossLair.skl.json`. Each file holds `arNodes` (position `vPosition`, choose-one group `nExclusiveGroupId`, root flag `eRootNodeType`) and `arConnections` (undirected node pairs).
- **Names and tooltips.** `json/enUS_Text/meta/StringList/Power_Warplans_BSK_*.stl.json` for Infernal Hordes and `Power_Warplans_BossLair_*.stl.json` for Lair Bosses. Each has a `name` label and a `desc` label.
- The import strips markup tags such as `{c_important}` from tooltips.

### Import

- `scripts/import-game-text.mjs` also writes `apps/web/src/data/war-plans.json`. It holds, for each War Plan, the nodes (id, x, y, choose-one group, root flag, tooltip) and the connections.
- HordeMind's own text stays in TypeScript: each node's "In HordeMind" line and its effect on the model (`affects`).
- A test checks that every node in `war-plans.json` has HordeMind text, and every HordeMind entry names a node that exists.

### Infernal Hordes War Plan

- The game files confirm our current tree: same 15 upgrades, same connections, same three choose-one pairs. Only the positions are new.
- `row` and `col` in `domain/warplan.ts` give way to the game's `x` and `y`.
- The Rewards branch (Exalted Council and the four upgrades after it) is drawn and can be learned. The model still ignores it.
- The counter counts every learned upgrade, Rewards included, against the game's 7 points. Its copy becomes "{n} {upgrade|upgrades} learned. The game allows 7 points across all branches."

### Lair Bosses War Plan

- All 17 upgrades plus the root are drawn. Seven sit next to the root.
- `lairBossNodes` stores any learned Lair Bosses upgrade, not only the six the model reads.
- The six that change a Hordes run carry a "◆ Hordes" mark under their name:
  - Varshan's Vengeance
  - Blood of Bartuc
  - Infernal Deception
  - Exotic Armory
  - Lair of Runes
  - Lair of Plenty
- Profiles saved before this change keep their nodes. A saved node that has no learned path to the root shows the existing "Saved before HordeMind followed the tree" notice, the same as Infernal Hordes does today.

### Unlock rule

- Infernal Hordes keeps each node's parents as they are today.
- Lair Bosses has loops, so it can't use parents. For example, you can reach Exotic Armory from Infernal Deception, Blood of Bartuc or Dog of Astaroth. A Lair Bosses upgrade opens once any neighbour is learned.
- Open point 1 asks the owner which rule the game uses. If the game uses neighbours for both trees, Infernal Hordes switches to the neighbour rule too.

## 2. Tree drawing (`kit/DiamondGraph`)

### Layout

- **Inputs.** Nodes with game `x` and `y`, plus the connection list. Choose-one partners come from `nExclusiveGroupId`.
- **Desktop.** One column step is 112 px and one row step is 116 px. Both trees span seven columns and seven rows, about 810 × 800 px.
- **Phone (below 700 px).** The tree scales to the content width, which gives about 53 px per column at 390 px. Nodes shrink to 32 px across, icons to 16 px, and labels are hidden.
- **Root.** It's drawn larger, always learned, and not focusable. Its icon is a flag tower for Infernal Hordes and a castle for Lair Bosses.

### Node look

| Part | Learned | Can learn | Locked or excluded |
|---|---|---|---|
| Rim | gold gradient (`--hm-frame-edge-top` → `--hm-frame-edge-bottom`) | gold gradient | dim gradient |
| Core | ember radial gradient | dark radial gradient | darker radial gradient |
| Glow | blurred ember halo behind the node | none | none |
| Icon | warm white | muted gold | faint at 38% opacity |
| Label | gold, weight 600 | ink | faint |

- Every label sits on a plate in `--hm-bg`, so connectors stop at the text and start again below it.
- The choose-one note ("or Total Chaos") sits under the name in faint italics.

### Connectors

- Each connection is a straight line between node centres, drawn in three layers:
  - a 6 px dark groove
  - a 2 px `--hm-rule` wire
  - for a lit connection, a 2.5 px ember line with a soft glow on top
- A connection is lit when both of its nodes are learned. Lit lines sit on their own layer above the unlit ones.
- The glow filter uses `filterUnits="userSpaceOnUse"`. A filter sized to the line's own box clips straight lines to nothing, because a horizontal or vertical line's box has zero width or height.

### Motion

- When a node is learned, each newly lit line draws itself from the learned neighbour over 520 ms.
- The new node's core and glow fade in over 420 ms after a 260 ms delay.
- Under `prefers-reduced-motion: reduce`, nothing animates.

### Interaction

- **Desktop.** Hovering or focusing a node shows its tooltip, its state and its "In HordeMind" line in the panel under the tree. Clicking toggles the node.
- **Phone.** Tapping a node selects it and shows the same panel, with a Learn or Unlearn button. The tree has no labels, so a single tap that toggled could change the wrong node unnoticed.
- **Keyboard.** Arrow keys move to the nearest node in that direction, as today. Enter or Space toggles the node. Focus shows a gold ring on the rim.
- **Assistive tech.** Each node is a button with `aria-pressed`. Its accessible name gives the upgrade's name and state.

## 3. Icons

- **Source.** The Game Icons set via `react-icons/gi`, version 5.7. `react-icons` is MIT, and the icons are CC BY 3.0.
- **Import.** Each icon is imported by name, so the bundle holds only the icons used. Ten icons measured 7.4 kB gzipped.
- **Credit.** The footer gets a line beside "Offer text © Blizzard Entertainment": "Icons by {authors} from game-icons.net, CC BY 3.0", linking to a credits section that lists each icon and its author.
- **Authors.** The plan looks up each icon's author in the game-icons.net repository, where icons are filed by author.

| War Plan | Node | Icon |
|---|---|---|
| Infernal Hordes | root | GiTowerFlag |
| Infernal Hordes | Exalted Council | GiThroneKing |
| Infernal Hordes | Council Coffers | GiLockedChest |
| Infernal Hordes | Forged in Flame | GiAnvil |
| Infernal Hordes | Flawless Find | GiGems |
| Infernal Hordes | Infernal Hoard | GiOpenTreasureChest |
| Infernal Hordes | Method and Madness | GiBrainstorm |
| Infernal Hordes | Reign in Hell | GiSharpCrown |
| Infernal Hordes | Impending Doom | GiSandsOfTime |
| Infernal Hordes | Total Chaos | GiVortex |
| Infernal Hordes | Pulse of Aether | GiPulse |
| Infernal Hordes | Bedlam | GiUnstableOrb |
| Infernal Hordes | The Black Pact | GiPentacle |
| Infernal Hordes | Cult of Annihilation | GiCultist |
| Infernal Hordes | Scale of Tathamet | GiDragonOrb |
| Infernal Hordes | Devil's Deal | GiScrollUnfurled |
| Lair Bosses | root | GiCastle |
| Lair Bosses | Two by Two | GiTwoShadows |
| Lair Bosses | Greater Nemesis | GiMagicPortal |
| Lair Bosses | Ultimate Nemesis | GiStarAltar |
| Lair Bosses | Nemesis Tides | GiHighTide |
| Lair Bosses | Infernal Deception | GiDevilMask |
| Lair Bosses | Exotic Armory | GiSpikedArmor |
| Lair Bosses | Dog of Astaroth | GiHound |
| Lair Bosses | Out of the Cold | GiFrozenBody |
| Lair Bosses | Blood of Bartuc | GiBlood |
| Lair Bosses | Varshan's Vengeance | GiFangedSkull |
| Lair Bosses | Lair of Runes | GiRuneStone |
| Lair Bosses | Lair of Plenty | GiOpenChest |
| Lair Bosses | Golden Hoard | GiGoldStack |
| Lair Bosses | Duriel's Invasion | GiMaggot |
| Lair Bosses | Grigoire's Gambit | GiBlackKnightHelm |
| Lair Bosses | Embers of Anguish | GiBurningEmbers |
| Lair Bosses | Children of Zir | GiVampireDracula |

## 4. Wave by wave as a fan chart (Insights, Report card)

### What it shows

- The band shows the model's forecast for your running total through the run, given the offers you took. The 80% range is a light wash, and the 50% range is a darker wash.
- A gold line marks the model's expected total. An ink line marks your total, with straight segments between readings.
- Dots mark readings, all in ink. The fan follows the running total, so a dot's place in the band can disagree with that reading's report-card verdict. The verdict lives in the tooltip and the table instead.
- The fan runs from the start to the last reading's wave.
- The stepper, the "Show as a table" fold-out and the empty state stay as they are.

### Data (`analysis/replay.ts`, `analysis/analyze.ts`)

- `replaySpans` also keeps each sample's running total at every wave. Council Aether joins the final wave only for a completed run whose last reading is that wave, the same rule the spans follow.
- `RunScores` gains:
  - `fan:{wave:number;mean:number;p10:number;p25:number;p75:number;p90:number}[]`, from wave 0 (all zeros) to the last reading
  - `readings:{wave:number;total:number}[]`
- Both are part of the per-run cache entry, so the cache key doesn't change.

### Drawing (`ui/insights/charts/FanChart.tsx`, replacing `RangeStrip.tsx`)

- `d3-scale` (`scaleLinear`, `.nice()`) and `d3-shape` (`area`, `line`, `curveMonotoneX`) compute the paths, and React renders the SVG.
- The y axis shows Aether, with gridlines at the `.nice()` ticks. The x axis shows "Start" and waves 1 to N.
- End labels "You {total}" and "Model {mean}" stay at least 16 px apart.
- **Hover and focus.** A crosshair snaps to the nearest reading. The tooltip lines are:
  - "You had {total} Aether"
  - "After wave {w}"
  - "Model expected about {mean}"
  - "80% range {p10}–{p90}"
  - "This reading's gain: inside the range" (or "below it", or "above it")
- Each reading's hit area is focusable and carries the same lines as its `aria-label`.
- The legend lists the 80% range, the 50% range, the model's expected total and your total.
- The table keeps one row per reading with a verdict column.

## 5. Dependencies

| Package | Licence | Use | Gzipped cost |
|---|---|---|---|
| `react-icons` 5.7 | MIT, icons CC BY 3.0 | node icons | about 7 kB per 10 icons |
| `d3-scale` 4 | ISC | fan chart scales | 10 kB together with `d3-shape`, measured |
| `d3-shape` 3 | ISC | fan chart areas and lines | (with `d3-scale`) |

TypeScript types come from `@types/d3-scale` and `@types/d3-shape`. All sizes were measured by bundling the packages on 2026-10-28.

## 6. Testing

- **Import.**
  - Infernal Hordes has 15 upgrades plus a root, 17 connections and three choose-one pairs, matching `domain/warplan.ts`.
  - Lair Bosses has 17 upgrades plus a root and 21 connections.
- **Unlock rule.**
  - Infernal Hordes parents are unchanged.
  - A Lair Bosses node opens from any learned neighbour, including Exotic Armory through each of its three neighbours.
- **Layout.**
  - At desktop size, no two label plates overlap, and no label plate covers another node. Text widths are estimated from a character width, as `warPlanGraphNodes` does now.
  - At 390 px, the tree fits the content width.
- **Fan data.**
  - `fan[0]` is all zeros, and `fan` ends at the last reading.
  - The fan's mean at the last reading equals the sum of the span means up to it.
  - Council Aether appears only in a completed run's final wave.
- **Fan chart.**
  - One dot per reading, and the end labels are at least 16 px apart.
  - The tooltip lines render for each reading.
- **e2e.**
  - Both trees render.
  - Learning a node lights its connection.
  - At 390 px, tapping a node opens the panel with a Learn button.
  - The fan chart renders with the seeded runs.
  - The credits link resolves.

## 7. Delivery

One branch, `feat/visual-upgrade`, and one PR. The owner previews the finished work locally once, before the PR opens (owner, 2026-10-28). The fan chart lands first on the branch, because it touches the replay that Phase C (calibration) extends. Phase C follows the merge.

## Open points for the owner

1. **Unlock rule.** In game, with Method and Madness, Impending Doom and The Black Pact learned (top, middle and bottom of the offers branch), can you learn Pulse of Aether without Reign in Hell? If yes, the game opens nodes from any learned neighbour, and both trees use that rule.
2. **Lair Bosses points.** How many points does the Lair Bosses War Plan allow? Until we know, it shows no counter.
3. **Icons.** Any icon in the table can change.
