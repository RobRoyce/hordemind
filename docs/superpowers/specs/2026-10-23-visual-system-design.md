# HordeMind visual system and UI rebuild

- **Status:** approved by the owner, 2026-10-23
- **Owner:** Rob Royce
- **Mockups:** `.superpowers/brainstorm/5386-1792809841/content/` (local only, gitignored)

## Goal

Replace the generic dark-SaaS look with a Diablo IV identity that stays fast to use mid-run.

Success means two things:
- A player glances between waves and knows which offer to take within about two seconds.
- The app looks like it belongs next to D4 rather than a dashboard template.

## Non-goals

- Light theme
- Recommender or simulation changes
- Features beyond the tap picker and the choice flag
- Community research uploads

## Decisions

| Topic | Decision |
|---|---|
| Play setups | Phone, second monitor and alt-tab weigh equally. The layout adapts by width, with no primary target. |
| Recommendation depth | Pick plus one line. Synergies, range and assumptions open on demand. |
| Visual direction | The "Horadric tome" look: boxless, a book serif and blackletter display, red-ink numerals. From the "Sanctuary" option it takes category pigments, the carved gold frame around the pick and ember-glowing Aether. |
| Scope | Rebuild on a component library. Layouts are fixed where they fight the direction. |
| Navigation | Slim top bar on desktop, bottom tabs on phones |
| Rename | "Strategy Lab" becomes "Character". The hash `#strategy` keeps working and redirects to `#character`. |
| Offer entry | Tap picker (category, then offer) next to typed search |
| Default choice | The best offer is pre-selected. Each choice records whether it was the untouched default. Undo is offered in a toast. |
| Black Pact | One dedicated row, replacing a toggle on every row |
| War Plan | Diamond nodes, right-angle connectors, game positions. The Rewards branch becomes one line. |
| Graph library | None. Layout comes from `row`/`col` in `domain/warplan.ts`. |

## 1. Foundations

### Colors

| Token | Value | Use |
|---|---|---|
| `bg` | #1a1510 | Page |
| `raised` | #221b14 | Inputs, menus, sheets |
| `ink` | #ebe1cc | Body text (14.0:1) |
| `muted` | #a5957a | Secondary text (6.2:1) |
| `faint` | #7d6d57 | Disabled and decoration only (3.6:1), never essential text |
| `rule` | #4a3c2b | Section dividers |
| `hair` | #30271b | Row dividers |
| `gold` | #e7c47c | Pick, primary action, focus ring |
| `amber` | #d9a35c | "Best pick" label |
| `ember` | #f0a24a | Aether values only |
| `rubric` | #c4473a | Red-ink numerals at display size only (3.7:1, large text) |
| `danger` | #e0604d | Danger flags, errors. The only red at small sizes. |

### Category pigments

The pigment colors the diamond next to a category name, never the text. All pass 3:1 against `bg`.

| Category | Pigment |
|---|---|
| Masses | #5fae95 |
| Spires | #7f9de2 |
| Hellborne | #e3708a |
| Fiends | #58b4c8 |
| Lords | #dcb25c |
| Monsters | #a39d93 |
| Hellfire | #ee8b3f |
| Player boon and Player bane | #a9c56b |
| Council | #c47fc3 |
| Special boss | #d24d5c |
| Chaos | #a88ef0 |

### Type

- **Display:** Grenze Gotisch 500/700. Page titles, the picked offer's name, section headings, wave and Aether numerals. Never below 20px.
- **Text:** Spectral 400/500/600, plus italic 400. Everything else.
- **Numbers:** lining, tabular figures.
- **Scale:** 13 / 15 / 17 / 21 / 26 / 32 / 42px.
- **Body size:** 15px on phones, 16px on desktop.
- **Floor:** no text below 13px.

### Space, shape, motion

- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48px.
- **Corners:** square, except the beveled `Frame`.
- **Motion:** only in response to the player, 150ms, disabled under `prefers-reduced-motion`.

### Accessibility

- Text contrast is at least 4.5:1, or 3:1 for display-size text and graphics.
- Touch targets are at least 44px. Phone tabs are 52px.
- The focus ring is 2px `gold`, offset 2px.

### Fonts

- `@fontsource/grenze-gotisch` and `@fontsource/spectral`, OFL-1.1, latin subset, bundled with the app.
- No requests go to Google, and the fonts work offline.
- `font-display: swap`.

## 2. Component library

### Structure

- `src/ui/kit/`: one `Component.tsx` and one `Component.module.css` per component.
- `kit/tokens.css`: CSS custom properties.
- `kit/fonts.ts`: font imports, loaded once from `main.tsx`.
- CSS Modules come with Vite, so there are no new styling dependencies.

### Kit components

| Component | Replaces | Notes |
|---|---|---|
| `Button` | `button`, `.primary`, `.quiet`, `.linklike` | Variants: `primary` (gold fill), `secondary` (gold outline), `text`. Min height 44px. |
| `Field` | Labels, `.field-help`, `.field-error`, hints | Label, inline help toggle, hint, error |
| `TextField`, `NumberField`, `Select`, `Checkbox` | Native inputs | Used inside `Field` |
| `Segmented` | Selects with 2–4 options | Radio-group semantics |
| `Tabs` | Profile chips, nav | Underline style |
| `Disclosure` | Every `<details>` | |
| `SectionHeading` | `.section-header`, `.surface h2` | |
| `PageHeader` | `.section-intro`, `.eyebrow` | Title and one line, no eyebrow labels |
| `Frame` | `.recommend-card.best`, `.surface` | Carved gold bevel, at most one per screen |
| `CategoryMark` | `.fam` pills | Pigment diamond and category name |
| `DangerMark` | `.danger`, `.risk-tag` | "High danger" or "Some danger" in `danger` |
| `Numeral` | `.tally`, `.stat`, `.counter` | Blackletter number and label. `ember` variant for Aether. |
| `WaveTrack` | `.wave-track`, `.progress-track` | |
| `RuledList` | Card stacks, `.session-list`, sensitivity table | Hairline-separated rows |
| `Notice` | `.banner`, `.error-msg`, `.notice`, `.recommend-alert` | `info`, `warning`, `error`, with the matching ARIA role |
| `Toast` | `.status` | Optional action, used for Undo |
| `AppNav` | Sidebar and phone bottom bar | Top bar at ≥ 700px, bottom tabs below that |
| `Sheet` | (new) | Bottom sheet below 700px, inline panel above. Focus trap and Escape when modal. |

### Screen components

Screen components are built only from the kit.

- **`ui/live/`:** `RunHeader`, `OfferSlot`, `OfferPicker`, `PickCard`, `EstimateDetails`, `PactAdvice`, `RecordBar`, `EndRunPanel`, `StartRun`.
- **`ui/character/`:** `CharacterTabs`, `CharacterForm`, `WarPlanTree`, `StartRunBar`.
- **`ui/insights/`:** `RunHistory`, `SyncPanel`, `ResearchNote`.

### Kit gallery

- A separate page, `kit.html`, built with the app so CI can test it and never linked from it.
- It shows every component in every state: default, hover, focus, disabled, error, both danger levels and all 11 pigments.
- It never appears in the app's nav.

### Boundaries

- `domain/`, `recommendation/`, `storage/` and `sync/` stay unchanged.
- The one exception is the choice flag (see Section 6).

## 3. Frame and navigation

### Desktop and second monitor (≥ 700px)

- **Top bar:** 58px. The `HordeMind` wordmark in Grenze Gotisch `gold`, the tabs (Character, Live Run, Insights), then the save status and Source link on the right.
- **Active tab:** `ink` text with a 2px `gold` underline.
- **Content width:**
  - Live Run: 640px.
  - Character: 900px, for the War Plan tree.
  - Insights: 720px.

### Phone (< 700px)

- **Top:** 52px. The wordmark and a short save status ("Saved", "Syncing…", "Sync failed").
- **Bottom tabs:** three text tabs, 52px tall, with `env(safe-area-inset-bottom)` padding.

### Footer

The footer sits at the end of the page on every screen. It holds:
- The experimental-simulator note
- The local-storage note
- "Offer text © Blizzard Entertainment"
- A "Report a problem" link to the issue chooser

### Removed

- The sidebar
- The sparkle logo tile
- The "v2 preview" pill
- The "Season 15 · experimental" block

## 4. Live Run

### Layout while deciding (top to bottom)

1. **Character line:** name, then class, difficulty and realm as one comma-separated phrase, and a "Run setup" `Disclosure` with an "Edit character" link.
2. **Numbers:** `Numeral` for wave ("3 of 10") and Aether (`ember`, with "after wave N" under it), then `WaveTrack`.
3. **Taken line:**
   - Each taken offer with its `CategoryMark`.
   - When the run's War Plan includes The Black Pact, its status in `muted`: "Black Pact unused" or "Black Pact used before wave N". Never red.
4. **Reading:** the "Aether after wave N" `NumberField`, labelled optional. It appears only once a wave has been played. "Event counts" is a `Disclosure` holding five optional fields.
5. **`SectionHeading`:** "Offers before wave N".
6. **Offer rows (`OfferSlot`):**
   - Rows keep the game's on-screen order.
   - Each row has a slot numeral button (`rubric`, gold fill when selected), the offer name with `CategoryMark` and `DangerMark`, the estimate on the right and a clear (×) button.
   - Phones wrap the category, danger and estimate onto a second line.
7. **Add actions:**
   - "Add another offer" while there are fewer than `MAX_OFFERS` rows.
   - "Add the Black Pact offer" when `p.specialRemaining` is true and no Pact row exists.
8. **`PickCard`** inside a `Frame`:
   - Label: "Best pick", or "Close call" when the result isn't robust.
   - Offer name.
   - "+N Aether by run end, M more than [runner-up]".
   - One line of why: the estimate's first reason.
   - Robustness line, worded by `result.robust`:
     - `true`: "Holds under every timing assumption tested."
     - `false`: "[Other offer] is best if [assumption]." It names the first sensitivity scenario whose best offer differs, taken from the assessments' `sensitivity` lists.
     - `null`: no line.
   - "Why this estimate" `Disclosure`.
9. **`RecordBar`:**
   - A primary `Button` labelled "Take [selected offer]", plus the keyboard hint on desktop.
   - It sticks above the tabs on phones.
10. **Quiet row:** Undo last decision, End run early, and the simulation footnote (samples, model version, waves left).

### Estimates

- **Shown:** each row shows `+N` or `−N`, with `gold` on the best row.
- **Missing:** `—` before a result exists, and "not modeled" for unmodeled offers.
- **Simulating:** values dim in place, and the layout never shifts.
- **Row details:** activating a row's estimate opens that offer's details inline. Details include the reasons, synergies, 5–95% range, components, sensitivity table, assumptions and the "Report it" link.

### Pre-selection and recording

- **When it applies:** once a fresh result exists and its best offer is modeled, that row is selected.
- **Kept picks:** a row selected by the player during this decision stays selected if its offer is still present. Otherwise the selection follows the new best.
- **No default:** with fewer than two offers or no modeled best, nothing is selected and the button reads "Choose the offer you took".
- **Recording:** `RecordBar`, or Ctrl/⌘+Enter, records the selected row.
- **Toast:** "Wave N: [offer] recorded", with an Undo action that calls the existing `undoChoice` flow.
- **Choice flag:** each record carries `choiceSource` (see Section 6).

### Keyboard

- `1`–`5` select a row when focus is outside a text field.
- Ctrl/⌘+Enter records.
- The rest of the keyboard behavior is unchanged.

### Black Pact row

- **The row:** one extra row with a `rubric` left rule (a graphic, so 3:1 suffices) and the label "Black Pact" in `ink`.
- **Recording:** recorded through `specialSlotIndex`, as today.
- **Removing it:** clears the special slot.
- **Picker shortcut:** its picker opens at step 2 for the last pick's category, because the tooltip says the Pact's offer shares it. Back returns to all categories.

### Other states

| State | Treatment |
|---|---|
| No run | The character summary, `Segmented` waves (10 Legendary, 8 Rare, 6 Magic, 4 Fleeting) and "Start a N-wave run". With no character, a prompt and a link to Character. |
| Unmodeled offers present | A `Notice` (warning) above the `Frame`: "Some offers aren't modeled yet, so the best modeled offer may not be the best offer." |
| High-danger pick | A `danger` line in the `Frame` naming the bane, plus "The estimate ignores danger." |
| Pact advice | A `Notice` (info) under the `Frame`, labelled "Black Pact" |
| All offers recorded | The `Frame` holds "Play wave N, then enter your final Aether", a final Aether `NumberField` and "Finish run" |
| Ending early | A confirm panel: "End run", "Keep recording" |
| Ended | A summary and "Start another N-wave run" |
| Simulator error | A `Notice` (error) in place of the `Frame` |

## 5. Tap picker (`OfferPicker`)

### Opening

- Tapping or focusing an empty row opens the picker:
  - Phones (< 700px) get a `Sheet`.
  - Wider screens get an inline panel under the row.
- Typing in the row's field searches with the existing `searchOffers`. Results replace the grid while there is text.

### Step 1: categories

- **Header:** "Offer K of N" and Close.
- **Search field:** "Type to search…".
- **Recent:** up to four offers from `recentOffers`, as one-tap rows.
- **Grid:** 3 columns on phones, 4 on wider screens.
- **Order:**
  - Most offers first, by count in the catalog. Ties follow the existing `FAMILY_ORDER`.
  - The order is computed from the catalog, never hard-coded, and never changes with history.
- **Tiles:**
  - Each tile shows `CategoryMark` and "N offers".
  - Categories with one offer show that offer's name instead, and one tap fills the row.
  - Player boon and Player bane stay separate tiles.
- **Likely hint:** with Method and Madness learned and a previous pick of known category, that tile gets a `gold` outline and the hint "Likely, after [category]". Nothing reorders.

### Step 2: offers

- A back control showing the category's `CategoryMark`.
- The category's offers, alphabetical, each with its boon and bane in the game's own words (`OfferRef.boon`, `OfferRef.bane`).

### After a pick

- The row fills, and the picker moves to the next empty row at step 1.
- It closes when no empty regular row remains.

### Keyboard

- Typing searches.
- Arrow keys move between tiles and list items.
- Enter opens or picks.
- Backspace on an empty field goes back a step.
- Escape closes and returns focus to the row.

### ARIA

- Search keeps today's `combobox` and `listbox` semantics.
- The grid is a `group` of buttons.
- The sheet is a `dialog` with a focus trap on phones.

## 6. Data change: `choiceSource`

- **Schema (`domain/schema.ts`):** add `choiceSource: z.enum(['default','picked']).nullable().default(null)` to the `offer_chosen` payload.
- **Recording (`domain/run.ts`):** `DecisionInput.choiceSource` passes through to the event.
- **Meaning:**
  - `default`: the recorded row is the pre-selected best, and the player never changed the selection during this decision.
  - `picked`: the player selected the row by tap or key. That includes re-selecting the best, and every record made when nothing was pre-selected.
  - `null`: legacy events only.
- **Storage:** events are JSONB in Postgres, so no migration is needed. Older clients ignore the field.

## 7. Character

- **`PageHeader`:** "Character" and "Changes save as you make them. Each run keeps a copy of the setup it started with."
- **`CharacterTabs`:** saved characters as underline tabs (name, plus class in `faint`), with "New character" last.
- **`CharacterForm`:** 2 columns on desktop, 1 on phones.

  | Field | Control |
  |---|---|
  | Name | `TextField` |
  | Class | `Select` |
  | Build | `TextField` |
  | Build planner link | `TextField` with today's URL validation |
  | Difficulty | `Select` |
  | Realm | `Segmented` (Season 15, Eternal) |
  | Elite and Lord clear speed | `Segmented` (Not sure, Fast, Average, Slow), keeping today's hint |
  | Mobility | `Segmented` (Not sure, High, Average, Low), keeping today's hint |

- **Help:** the (?) toggle (a diamond) expands its tip inline under the label (`aria-expanded`). It never relies on hover.
- **War Plan section:**
  - Heading and location line.
  - Splinter of Terror rank `NumberField`.
  - Counter: "N upgrades learned here. The game allows 7 points across all branches, Rewards included." It warns above 7, as today.
  - The tree (Section 8).
  - The line "The Rewards branch (Exalted Council and the four upgrades after it) only changes loot, so it's left out here."
  - The detail panel.
- **`StartRunBar`:** `Segmented` waves and "Start a N-wave run".
- **Saved data:** Rewards upgrades already saved stay in `warPlanNodes`. They are not drawn.

## 8. War Plan tree

### Drawing

- **Branches:**
  - "Offers and Chaos" (wide) and "Aether events" (narrow) sit side by side on desktop.
  - On phones they stack.
- **Nodes:** diamonds with their names centered underneath.

  | State | Treatment |
  |---|---|
  | Learned | `gold` stroke, dark ember fill |
  | Can learn | `ink` stroke |
  | Locked or excluded | `faint` dashed stroke |
  | Focused (tooltip showing) | Faint `gold` ring |

- **Choose-one pairs:** each exclusive node shows "or [partner]" in `muted` italic under its name. No arcs. The mockup's red ink fails 4.5:1 at this size.
- **Connectors:**
  - `gold` when both ends are learned, otherwise `rule`.
  - Right angles only.
- **Legend:** Learned, Can learn, Locked or excluded.
- **Detail panel:**
  - Fixed height.
  - Shows the name, the verbatim tooltip in italics and "In HordeMind: …".
  - Includes the "Tooltip or effect wrong? Report it" link.

### Layout function (`kit/graphLayout.ts`)

- **Input:** nodes with `row`, `col` and `parents`, plus column width, row height and label metrics.
- **Output:** node centers, label boxes and connector paths.
- **Routing rules:**
  1. A connector leaves from the bottom of the parent's label block, never from inside it.
  2. A parent in the child's column runs straight down to the child's top vertex.
  3. A parent in another column, when the child also has a same-column parent, runs down to the child's center line, then across into the nearest side vertex.
  4. Any other parent drops to a bus line halfway between the rows, runs across to the child's column, then down to the top vertex.

### Accessibility

- Each node is a `button` with `aria-pressed` for learned and `aria-disabled` with a reason when locked.
- Arrow keys move between nodes.
- The tree has a text alternative listing each branch.

## 9. Insights

- **`PageHeader`:** "Insights" and "Your runs, kept on this device."
- **Summary:** one sentence, "N runs, N recorded choices, and N waves with event counts", with the numbers in blackletter. It replaces the stat tiles.
- **Run history:** a `RuledList`.
  - Left side: character and class, then date, realm and difficulty.
  - Right side: Aether in `ember` (or "In progress" in `amber`), then the wave count and outcome.
  - Tapping a row opens the run, as today.
- **Export:** an "Export all runs" `secondary` button.
- **Private sync:** same states and copy, tightened. Buttons use the kit.
- **Community research:** two sentences. Nothing is shared, and any future opt-in will be separate, with withdrawal and deletion.

## 10. Testing

| Area | Test |
|---|---|
| Layout function | Vitest: no two node boxes overlap, every connector is right-angled, and every connector starts below its parent's label |
| Rendered tree | Playwright measures the live SVG and fails if a connector crosses any label or node that isn't one of its own ends |
| Picker | Vitest: category order from catalog counts, alphabetical offers, one-tap categories, the Likely hint only with Method and Madness, the Pact row opening at its category |
| Pre-selection | Vitest on the selection reducer: follows the new best until the player picks, keeps a player's pick while its offer remains, and sets `choiceSource` correctly |
| Schema | Vitest: legacy `offer_chosen` events without `choiceSource` parse to `null`, and new events round-trip |
| Journey baseline (Kit PR) | The existing e2e finds elements by role and label instead of CSS class names, and runs at both 1440×900 and 390×844. It must pass against today's screens before any screen changes. |
| Journey changes (Screens PR) | Edits are limited to behavior that changes: the Character tab and `#character` hash, the pre-selected pick and `choiceSource`, the Black Pact row, a tap-only run with no typing, and Undo from the toast. |
| Accessibility | `@axe-core/playwright` (dev dependency, MPL-2.0) scans the kit gallery from the Kit PR on, and each screen from the Screens PR on. Any serious or critical violation fails. |
| Visual | Screenshots of every screen at both sizes, plus the kit gallery, attached to each PR |
| Gate | `make verify` passes locally before every push |

## 11. Delivery

1. **Kit PR.** No visible change to the app. It contains:
   - Tokens, fonts, kit components, `Sheet`, `graphLayout` and the `kit.html` gallery, with their tests.
   - The e2e migration to role and label selectors, plus the 390×844 pass, proven green against today's screens.
   - Where a selector needs it, accessible names added to today's markup. These cause no visible change.
2. **Screens PR.**
   - One commit each for frame and nav, Live Run (picker, pre-selection, `choiceSource`, toast), Character and Insights.
   - It deletes `style.css`.
   - E2e edits are limited to the changed behavior listed in Testing. Any other e2e edit needs a stated reason in the PR description.

**Why the test migrates first:** the browser test guards behavior. If it were rewritten in the same PR as the screens, a regression could be "fixed" by adjusting the test. Migrating it against the old UI proves that the selectors, not the behavior, are what changed.

- **Rollback:** each PR reverts on its own. `choiceSource` is optional, so older code ignores it.

## Risks

- **Blackletter legibility.** Grenze Gotisch can be hard to read for some players. It's limited to display sizes of 20px and up, and numbers in running text use Spectral.
- **Category order.** It follows catalog counts, not real appearance rates, which the game doesn't publish. Revisit if community data arrives.
- **Mis-taps.** Pre-selection makes misses on the button land on the pick. Undo fixes the ones players notice, and `choiceSource` lets later analysis discount accepted defaults.
- **Unverified game positions.** The War Plan layout matches the owner's transcription. Column order within a row has not been checked against an in-game screenshot.
