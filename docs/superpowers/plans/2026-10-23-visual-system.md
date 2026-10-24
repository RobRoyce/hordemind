# Visual System and UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild HordeMind's UI on a component library in the approved "Horadric tome" style, with a single-column Live Run, a tap picker, a Character page and a cleaner War Plan tree. Behavior and data are unchanged except one new field, `choiceSource`.

**Architecture:**
- `src/ui/kit/` holds token-driven React components styled with CSS Modules.
- Screens in `ui/live/`, `ui/character/` and `ui/insights/` are built only from the kit.
- Pure logic (graph layout, picker model, selection model, robustness line) lives in small `.ts` files with Vitest tests. Browser behavior is checked by Playwright scripts against the production build.

**Tech Stack:**
- React 19, TypeScript strict, Vite 7, CSS Modules, Vitest 3, Playwright 1.56.
- New dependencies:
  - `@fontsource/grenze-gotisch` 5.3.0 and `@fontsource/spectral` 5.3.0, both OFL-1.1.
  - `@axe-core/playwright` 4.14.0, MPL-2.0, dev only.

**Spec:** `docs/superpowers/specs/2026-10-23-visual-system-design.md`. Executors read the spec and this plan together. Section numbers below (§) refer to the spec.

## Global Constraints

- **Pull requests.**
  - Two PRs, never stacked.
  - PR 1 is the branch `design/visual-system`. It already holds the spec and this plan.
  - PR 2 branches from `main` only after the owner merges PR 1.
  - The owner merges, by running `! gh pr merge <N> --squash --delete-branch`.
- **Pushing.** Push with `git push git@github.com:RobRoyce/hordemind.git <branch>`.
- **Commits.** Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Gate.** Run `make verify` (`scripts/verify-local.sh`) and see it pass before every push. Say "locally tested" only for checks that ran here.
- **Domain code.** Don't modify `src/domain/`, `src/recommendation/`, `src/storage/` or `src/sync/`. The one exception is Task 8, plus exporting `FAMILY_ORDER` from `src/catalog.ts` in Task 10.
- **Tokens.**
  - All design tokens are CSS custom properties prefixed `--hm-`, defined only in `src/ui/kit/tokens.css`.
  - No component CSS contains a hex color or a `font-size` below `13px`. Task 2 adds a test that enforces this.
- **Breakpoint.** Phone layout is `@media (max-width: 699px)`. Desktop is everything wider.
- **Fonts.** They load only through `src/ui/kit/fonts.ts`, with no network font requests. Fallback stacks:
  - Display: `'Grenze Gotisch', 'Spectral', Georgia, serif`.
  - Text: `'Spectral', Georgia, serif`.
- **Copy rules for UI text.**
  - No `·` separators.
  - No ALL-CAPS labels, and no `letter-spacing` on labels.
  - No `↗` or `→` in link text.
  - Sentence case.
- **Accessible names the browser tests rely on.** Keep these exactly in PR 1 and PR 2:

  | Element | Accessible name |
  |---|---|
  | Main nav | `<nav aria-label="Main navigation">`, items are `button`s with `aria-current="page"` |
  | Offer inputs | `combobox` named `Offer N` |
  | Typed search results | `option` |
  | Row choose buttons | `Choose offer N: [offer]` |
  | Record button | `Take [offer]` |
  | Undo | `Undo last decision` |
  | End run | `End run early`, then a heading `End this run now?` and a button `End run` |
  | Ended run | heading `Run ended` |
  | Offers heading | `Offers before wave N` |
  | Taken offers | label `Offers taken` |
  | Estimates | label `Estimate for [offer]` |
  | Robustness line | label `Robustness` |
  | Pact advice | label `Black Pact advice` |
  | Recommendation | region `Recommendation` |
  | War Plan nodes | `button` named by node id, with `aria-pressed` |
  | War Plan details | region `Upgrade details` |
  | Run setup summary | label `Character summary` |
  | Estimate report links | `Something wrong? Report it` |

- **Spec amendment (approved with this plan).** The kit gallery is a separate page, `kit.html`. It's built with the app so CI can test it, and it's never linked from the app. This replaces "renders only when `import.meta.env.DEV`" in §2. Task 7 also edits the spec.

## Review Focus

These are inputs the spec implies but no feature test covers. Each line names the owning task that adds the pinning test.

1. **Longest offer name at 390px.** "The Summoned Hellborne (hunting you)" in a row, a step 2 list and a recent row must wrap without horizontal page scroll. Owned by Task 12c, which asserts `scrollWidth <= innerWidth`.
2. **Number keys while the picker is open.** Pressing `2` with a category tile focused must not select row 2. Owned by Task 12c, with an e2e step.
3. **Unlisted offers.** Typed text that matches no offer must still offer "record as unlisted". The row shows an "Unlisted" mark, and saved runs with unlisted offers render. Owned by Task 12a (e2e step) and Task 4 (`CategoryMark` null test).
4. **Fonts that fail to load.** Layout must stay readable on fallback fonts. Owned by Task 2, whose test asserts the fallback stacks in `tokens.css`.
5. **Undo toast lifetime.** A toast with an action stays at least 8 seconds and is replaced, not stacked, by the next toast. Owned by Task 11, with a unit test on `nextToast`.

---

# PR 1: Kit (branch `design/visual-system`)

### Task 1: Browser test baseline on today's screens

Migrate the e2e to role and label selectors and add a 390×844 pass. Add accessible names to today's markup where a selector needs them. Nothing may change visibly.

**Files:**
- Modify: `apps/web/tests/e2e.mjs`
- Modify: `apps/web/src/ui/LiveRun.tsx`. Add `aria-label="Character summary"` on the `<dl className="character-summary">`.
- Modify: `apps/web/src/ui/OfferRecommendations.tsx`:
  - `aria-label={'Estimate for '+item.offer}` on `.recommend-metric`.
  - `aria-label="Robustness"` on each `.verdict`.
  - `aria-label="Black Pact advice"` on `.pact-advice`.
  - `aria-label="Recommendation"` on the section (it has `aria-labelledby` today; keep the visible heading).
- Modify: `apps/web/src/ui/WarPlanTree.tsx`. Add `role="region" aria-label="Upgrade details"` on both `Detail` roots.

**Interfaces:**
- Produces, in `e2e.mjs`:
  - `journey(viewport:{width:number;height:number})` runs today's full journey in a fresh context.
  - `setChoice(page,label:RegExp|string,optionLabel:string)` works whether the control is a `<select>` (selects by option label) or a `radiogroup` (clicks the `radio` with that name).
  - `choiceOf(page,label)` returns the selected option label or the checked radio's name.
  - `navTo(page,name:RegExp)` clicks within `getByRole('navigation',{name:'Main navigation'})`.

- [ ] **Step 1: Rewrite the selectors.** Replace every CSS-class locator in `e2e.mjs` with the contracts in Global Constraints:

  | Today's locator | Replacement |
  |---|---|
  | `.wp-detail` | `getByRole('region',{name:'Upgrade details'})` |
  | `.character-summary` | `getByLabel('Character summary')` |
  | `.recommend-card` count | `getByLabel(/^Estimate for /)` count |
  | `.recommendations` text | `getByRole('region',{name:'Recommendation'})` |
  | `.verdict` | `getByLabel('Robustness')` |
  | `.recommendations .danger` | `getByText(/(High\|Some) danger/)` |
  | `.recommendations .report-link` | `getByRole('link',{name:'Something wrong? Report it'}).first()` |
  | `#decision-title` | `getByRole('heading',{name:/Offers before wave/})` |
  | `.pact-advice` | `getByLabel('Black Pact advice')` |
  | `.special-status` | `getByText(/Black Pact (offer )?used before wave 2/)` |
  | `.stack` | `getByLabel('Offers taken')` |
  | `.stat` nth(1) | `getByText(/2\s*recorded choices/i)` |
  | `.wp-node` (diagnostics) | `getByRole('button',{pressed:true})` |

  Then make these swaps:
  - Selects go through `setChoice` and `choiceOf`, using labels `'Difficulty'`, `'Realm'` and `/Elite (\/|and) Lord clear speed/`, with options `'Torment XII'`, `'Eternal'`, `'Fast'` and `'Low'`.
  - Nav clicks use `navTo`, with names `/^(Strategy Lab|Character)/`, `/^Live Run/` and `/^Insights/`.
  - `'Start live run'` becomes `/^Start (live run|a \d+-wave run)$/`, `'Start run'` becomes `/^Start (run|a \d+-wave run)$/` and `/Export data/` becomes `/Export (data|all runs)/`.
  - The `modeled estimates shown` assertion becomes: `getByLabel('Estimate for The Puffing Masses')` text matches `/[+−]\d+/`.

- [ ] **Step 2: Wrap and run twice.** Wrap the body in `journey(viewport)` and run it for `{width:1440,height:900}`, then `{width:390,height:844}`. Each run gets a new `browser.newContext`, so storage starts empty.

- [ ] **Step 3: Add the accessible names** listed under Files.

- [ ] **Step 4: Run on today's screens.**
  - Run: `cd apps/web && npm run build && (npx vite preview --host 127.0.0.1 --port 4173 &) && E2E_BASE_URL=http://127.0.0.1:4173/ node tests/e2e.mjs`
  - Expected: `v2 browser smoke passed`, after both viewports log their steps.
  - If the 390px pass fails on today's UI, stop and report the failure. Don't loosen an assertion to make it pass.

- [ ] **Step 5: Confirm nothing changed visibly.**
  - Screenshot `#run` with three offers, `#strategy` and `#insights` at 1440×900, before and after Step 3, using the Playwright MCP or a scratch script.
  - Expected: the images match exactly. The added attributes don't render.

- [ ] **Step 6: Commit.** `test: e2e finds elements by role and label, runs at 1440 and 390 wide`

### Task 2: Tokens, fonts and the CSS guard

**Files:**
- Create: `apps/web/src/ui/kit/tokens.css`, `apps/web/src/ui/kit/fonts.ts`, `apps/web/src/ui/kit/tokens.test.ts`
- Modify: `apps/web/package.json` and `package-lock.json`. Add `@fontsource/grenze-gotisch` and `@fontsource/spectral` at exactly `5.3.0`.

**Interfaces:**
- Produces tokens in `:root`:
  - `--hm-bg`, `--hm-raised`, `--hm-sheet` (#201912), `--hm-ink`, `--hm-muted`, `--hm-faint`, `--hm-rule`, `--hm-hair`, `--hm-gold`, `--hm-amber`, `--hm-ember`, `--hm-rubric`, `--hm-danger`.
  - Pigments `--hm-fam-masses|spires|hellborne|fiends|lords|monsters|hellfire|player|council|special|chaos`.
  - `--hm-font-display`, `--hm-font-text`.
  - Spacing `--hm-space-1..7` = 4/8/12/16/24/32/48px.
  - Type `--hm-text-1..7` = 13/15/17/21/26/32/42px.
  - `--hm-motion: 150ms`.
- Values are exactly the spec's §1 tables.
- `tokens.css` also holds:
  - A `@media (prefers-reduced-motion: reduce)` rule that sets `transition-duration` and `animation-duration` to `0s` on `*`.
  - A `.hm-visually-hidden` utility class.
  - A global `:focus-visible` rule: `outline: 2px solid var(--hm-gold); outline-offset: 2px`.
  - `body` uses the `--hm-bg` background and `--hm-ink` color, so the page is dark before any component renders.
- Produces `fonts.ts`, which imports `@fontsource/grenze-gotisch/500.css`, `/700.css` and `@fontsource/spectral/400.css`, `/500.css`, `/600.css`, `/400-italic.css`.

- [ ] **Step 1: Write the failing test** `tokens.test.ts`. It reads `tokens.css` with `node:fs`, parses `--hm-*: #xxxxxx`, and computes WCAG contrast.

```ts
it('meets the spec contrast floors',()=>{
 for(const t of ['ink','muted','gold','amber','ember','danger'])
  for(const bg of ['bg','raised','sheet'])expect(contrast(tok[t],tok[bg]),`${t} on ${bg}`).toBeGreaterThanOrEqual(4.5);
 for(const t of ['rubric','faint'])expect(contrast(tok[t],tok.bg)).toBeGreaterThanOrEqual(3);
 for(const f of FAMILY_SLUGS)expect(contrast(tok['fam-'+f],tok.bg),f).toBeGreaterThanOrEqual(3);
});
it('keeps fallback font stacks',()=>{
 expect(css).toMatch(/--hm-font-display:\s*'Grenze Gotisch',\s*'Spectral',\s*Georgia,\s*serif/);
 expect(css).toMatch(/--hm-font-text:\s*'Spectral',\s*Georgia,\s*serif/);
});
it('component CSS uses tokens only',()=>{
 for(const file of globModuleCss('src/ui')){  // every *.module.css under src/ui
  const text=readFileSync(file,'utf8');
  expect(text,file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  for(const m of text.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1]),file).toBeGreaterThanOrEqual(13);
 }
});
```

  `FAMILY_SLUGS` is the 11 pigment slugs. `globModuleCss` is a small recursive `readdirSync` walk in the test file.

- [ ] **Step 2: Run it.** `cd apps/web && npx vitest run src/ui/kit/tokens.test.ts`. Expected: FAIL, because `tokens.css` doesn't exist.
- [ ] **Step 3: Implement.** Create `tokens.css` and `fonts.ts`, then `npm install --save-exact @fontsource/grenze-gotisch@5.3.0 @fontsource/spectral@5.3.0`.
- [ ] **Step 4: Run again.** Same command. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit.** `feat(kit): design tokens, bundled fonts, CSS token guard`

### Task 3: Action and field components

**Files:**
- Create in `apps/web/src/ui/kit/`: `Button.tsx`, `Field.tsx` (exports `Field`, `TextField`, `NumberField`, `Select`, `Checkbox`), `Segmented.tsx`, a `.module.css` for each, and `actions.test.tsx`.

**Interfaces:**
- `Button(props:React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'text'})`. `type` defaults to `"button"` and `variant` defaults to `'secondary'`.
- `Field({label,help,hint,error,children}:{label:string;help?:string;hint?:string;error?:string;children:(wire:{id:string;describedBy?:string;invalid:boolean})=>React.ReactNode})`.
  - It renders `<label htmlFor={id}>`.
  - When `help` is set, it adds a help toggle: a `button` with `aria-expanded` and `aria-controls` pointing at the tip `<p>`, and the accessible name `Help: [label]`. The tip is hidden until the toggle opens it.
  - `describedBy` joins the hint and error ids.
- `TextField`, `NumberField` and `Select` are thin native wrappers taking `wire` plus native props.
- `Checkbox({label,checked,onChange})`.
- `Segmented<T extends string>({label,value,options,onChange}:{label:string;value:T;options:readonly {value:T;label:string}[];onChange:(v:T)=>void})`.
  - It renders `role="radiogroup" aria-label={label}` and children `role="radio" aria-checked`.
  - It uses roving `tabIndex`. ArrowLeft/ArrowRight move and select. Home and End jump.

- [ ] **Step 1: Write the failing tests** in `actions.test.tsx`, using `renderToStaticMarkup` from `react-dom/server`.

```tsx
it('Button defaults to type=button',()=>expect(html(<Button>Go</Button>)).toContain('type="button"'));
it('Field wires label, hint and error',()=>{
 const out=html(<Field label="Mobility" hint="h" error="e">{w=><input id={w.id} aria-describedby={w.describedBy} aria-invalid={w.invalid}/>}</Field>);
 const id=/for="([^"]+)"/.exec(out)![1];
 expect(out).toContain(`id="${id}"`);expect(out).toMatch(/aria-describedby="[^"]+ [^"]+"/);expect(out).toContain('aria-invalid="true"');
});
it('help starts collapsed',()=>expect(html(<Field label="Realm" help="tip">{()=>null}</Field>)).toMatch(/aria-expanded="false"[^>]*>|aria-label="Help: Realm"/));
it('Segmented checks exactly one radio',()=>{
 const out=html(<Segmented label="Realm" value="Eternal" options={[{value:'Season 15',label:'Season 15'},{value:'Eternal',label:'Eternal'}]} onChange={()=>{}}/>);
 expect(out).toContain('role="radiogroup"');expect(out.match(/aria-checked="true"/g)).toHaveLength(1);
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/kit/actions.test.tsx`. Expected: FAIL, modules missing.
- [ ] **Step 3: Implement** the components to the interfaces. Primary is a gold gradient fill with dark text, secondary is a gold outline, text is underlined `muted`. Everything is at least 44px tall.
- [ ] **Step 4: Run again.** Same command, plus `npx vitest run src/ui/kit/tokens.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(kit): Button, Field family, Segmented`

### Task 4: Structure and game marks

**Files:**
- Create in `apps/web/src/ui/kit/`: `Tabs.tsx`, `Disclosure.tsx`, `SectionHeading.tsx`, `PageHeader.tsx`, `Notice.tsx`, `Toast.tsx`, `RuledList.tsx`, `Frame.tsx`, `CategoryMark.tsx`, `DangerMark.tsx`, `Numeral.tsx`, `WaveTrack.tsx`, a `.module.css` for each, `marks.test.tsx`, and `index.ts`.
- `index.ts` re-exports every kit component and imports `./tokens.css`.

**Interfaces:**
- `Tabs({label,items,current,onSelect,trailing}:{label:string;items:readonly {id:string;label:string;detail?:string}[];current:string|null;onSelect:(id:string)=>void;trailing?:React.ReactNode})`. It renders `role="group" aria-label` with `button`s carrying `aria-pressed`.
- `Disclosure({summary,children,open?})` renders native `details` and `summary`.
- `SectionHeading({children,level=2,aside})`.
- `PageHeader({title,lead})` renders an `h1`.
- `Notice({tone,label,children}:{tone:'info'|'warning'|'error';label?:string;children})`. Error gets `role="alert"`, the others `role="note"`. `label` sets `aria-label`.
- `Toast({message,action}:{message:string;action?:{label:string;onClick:()=>void}})` renders `role="status" aria-live="polite"`.
- `RuledList({label,children})` renders a `ul` with `aria-label`. Rows are `li`.
- `Frame({label,children})` renders `<section aria-label={label}>` with the bevel from §1, using pseudo-elements and a `clip-path` polygon with an 11px cut.
- `familySlug(f:OfferFamily):FamilySlug`. Player boon and Player bane both give `player`. Special boss gives `special`. Everything else is lowercased.
- `CategoryMark({family}:{family:OfferFamily|null})`. `null` renders a faint dashed diamond and "Unlisted".
- `DangerMark({danger}:{danger:Danger})` renders "High danger" or "Some danger", with `title` set to `danger.why`.
- `Numeral({label,value,of,note,tone='plain'})`. `value:null` renders `—`. `tone:'ember'` uses `--hm-ember` and the glow.
- `WaveTrack({total,taken,deciding})` takes `taken:readonly string[]` and `deciding:boolean`.
  - It renders `<ol aria-label="Wave decisions">` with `total` items.
  - Each item has visually hidden text exactly as in today's `LiveRun.tsx`.

- [ ] **Step 1: Write the failing tests** in `marks.test.tsx`.

```tsx
it('every offer family has a pigment token',()=>{
 const css=readFileSync('src/ui/kit/tokens.css','utf8');
 for(const f of FAMILY_ORDER_LOCAL)expect(css,f).toContain(`--hm-fam-${familySlug(f)}:`);
});
it('unlisted offers get a mark',()=>expect(html(<CategoryMark family={null}/>)).toContain('Unlisted'));
it('errors are alerts',()=>expect(html(<Notice tone="error">x</Notice>)).toContain('role="alert"'));
it('missing numbers show a dash',()=>expect(html(<Numeral label="Aether" value={null}/>)).toContain('—'));
it('wave track names each wave',()=>{
 const out=html(<WaveTrack total={4} taken={['The Puffing Masses']} deciding/>);
 expect(out.match(/<li/g)).toHaveLength(4);expect(out).toContain('Wave 1: The Puffing Masses');expect(out).toContain('Wave 2: deciding now');
});
it('toast exposes its action',()=>expect(html(<Toast message="m" action={{label:'Undo',onClick:()=>{}}}/>)).toMatch(/<button[^>]*>Undo</));
```

  `FAMILY_ORDER_LOCAL` lists the 12 `OfferFamily` values inline, because `catalog.ts` exports `FAMILY_ORDER` only from Task 10.

- [ ] **Step 2: Run them.** `npx vitest run src/ui/kit/marks.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** to the interfaces.
- [ ] **Step 4: Run all kit tests.** `npx vitest run src/ui/kit`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(kit): structure components and game marks`

### Task 5: Sheet and AppNav

**Files:**
- Create in `apps/web/src/ui/kit/`: `Sheet.tsx`, `AppNav.tsx`, `useNarrow.ts`, `Sheet.module.css`, `AppNav.module.css`, `shell.test.tsx`.

**Interfaces:**
- `useNarrow():boolean` matches `(max-width: 699px)` through `matchMedia` and updates on change.
- `Sheet({open,title,onClose,children,returnFocus}:{open:boolean;title:string;onClose:()=>void;children:React.ReactNode;returnFocus?:React.RefObject<HTMLElement|null>})`.
  - Narrow: a bottom sheet with `role="dialog" aria-modal="true" aria-label={title}`. Focus is trapped (Tab cycles), Escape closes, a backdrop click closes, and focus returns to `returnFocus` on close.
  - Wide: an inline panel with `role="group" aria-label={title}`. Escape closes. No trap.
  - Closed: renders nothing.
- `AppNav({items,current,onSelect,status,sourceUrl}:{items:readonly {id:string;label:string}[];current:string;onSelect:(id:string)=>void;status:string;sourceUrl:string})`.
  - It renders the header with the wordmark "HordeMind", one `<nav aria-label="Main navigation">` of `button`s with `aria-current="page"` on the current one, the status text and a "Source" link.
  - Below 700px the nav is a fixed bottom bar with 52px items and safe-area padding.

- [ ] **Step 1: Write the failing tests** (static markup).

```tsx
it('marks the current section',()=>{
 const out=html(<AppNav items={[{id:'character',label:'Character'},{id:'run',label:'Live Run'}]} current="run" onSelect={()=>{}} status="Saved" sourceUrl="x"/>);
 expect(out).toContain('aria-label="Main navigation"');expect(out).toMatch(/aria-current="page"[^>]*>Live Run/);expect(out).toContain('HordeMind');
});
it('a closed sheet renders nothing',()=>expect(html(<Sheet open={false} title="t" onClose={()=>{}}>x</Sheet>)).toBe(''));
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/kit/shell.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Focus trap behavior is verified in the browser in Task 7.
- [ ] **Step 4: Run again.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(kit): Sheet and AppNav`

### Task 6: Graph layout and DiamondGraph

**Files:**
- Create in `apps/web/src/ui/kit/`: `graphLayout.ts`, `graphLayout.test.ts`, `DiamondGraph.tsx`, `DiamondGraph.module.css`.

**Interfaces:**

```ts
export interface Box{x:number;y:number;width:number;height:number}
export interface GraphNodeInput{id:string;row:number;col:number;parents:readonly string[];labelLines:number;labelWidth:number}
export interface LayoutOptions{colWidth:number;rowHeight:number;diamond:number;lineHeight:number;labelGap:number}
export interface PlacedNode{id:string;x:number;y:number;diamond:Box;label:Box}
export interface Connector{from:string;to:string;points:readonly (readonly [number,number])[]}
export interface GraphLayout{nodes:PlacedNode[];connectors:Connector[];width:number;height:number}
export function layoutGraph(nodes:readonly GraphNodeInput[],o:LayoutOptions):GraphLayout
export const DEFAULT_LAYOUT:LayoutOptions // {colWidth:140,rowHeight:130,diamond:38,lineHeight:16,labelGap:8}
```

- `DiamondGraph({nodes,layout,state,focused,onActivate,onFocusNode,label})`:
  - `state(id)` returns `'learned'|'open'|'locked'`.
  - `nodes` are `GraphNodeInput`s plus `name:string` and `note?:string`, where `note` is the "or [partner]" line.
  - It renders an SVG for connectors (`data-graph-edge`, `data-from`, `data-to`) and labels (`data-graph-label`), and absolutely positioned `button`s over each diamond and label box (`data-graph-node`). Buttons are named by `name` and carry `aria-pressed` for learned and `aria-disabled` for locked.
  - A connector is gold (`--hm-gold`) when both ends are learned. Otherwise it uses `--hm-rule`.
  - Arrow keys move focus between nodes by nearest center in that direction.

**Routing** (§8). This is the algorithm the signature doesn't determine:

```
center(n)   = ((col+0.5)*colWidth, row*rowHeight + diamond/2 + 8)
labelTop    = center.y + diamond/2 + labelGap
labelBottom = labelTop + labelLines*lineHeight
For each edge parent P → child C:
 start = (P.x, labelBottom(P) + 4)
 if P.col == C.col:                                       straight to (C.x, C.y - diamond/2)
 else if C has a parent in C.col:                         (P.x, C.y) then across to (C.x ± diamond/2, C.y), the side facing P
 else:  busY = (labelBottom(P) + C.y - diamond/2) / 2;    (P.x, busY), (C.x, busY), (C.x, C.y - diamond/2)
```

- [ ] **Step 1: Write the failing tests** using the real `WAR_PLAN` offers branch. Map each node to `labelLines = 1 + (exclusive?1:0)` and `labelWidth = 8*max(name.length, ('or '+exclusive).length)`.

```ts
it('no two node boxes overlap',()=>{const L=layout();for(const [a,b] of pairs(L.nodes))for(const [p,q] of [[a.diamond,b.diamond],[a.label,b.label],[a.diamond,b.label],[a.label,b.diamond]])expect(intersects(p,q),`${a.id}/${b.id}`).toBe(false)});
it('connectors are right-angled',()=>{for(const c of layout().connectors)for(const [p,q] of segs(c.points))expect(p[0]===q[0]||p[1]===q[1]).toBe(true)});
it('connectors leave below the parent label',()=>{const L=layout();for(const c of L.connectors)expect(c.points[0][1]).toBeGreaterThan(boxOf(L,c.from).label.y+boxOf(L,c.from).label.height)});
it('no connector crosses a node or label it does not join',()=>{const L=layout();for(const c of L.connectors)for(const n of L.nodes.filter(n=>n.id!==c.from&&n.id!==c.to))for(const s of segs(c.points))expect(segHitsBox(s,n.diamond)||segHitsBox(s,n.label),`${c.from}>${c.to} hits ${n.id}`).toBe(false)});
it('the Black Pact takes side parents at its side vertices',()=>{const c=connector('Bedlam','The Black Pact');const bp=node('The Black Pact');expect(c.points.at(-1)).toEqual([bp.x+DEFAULT_LAYOUT.diamond/2,bp.y])});
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/kit/graphLayout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `layoutGraph` with the routing above, and `DiamondGraph` to its interface.
- [ ] **Step 4: Run again.** Same command. Expected: PASS, 5 tests.
- [ ] **Step 5: Commit.** `feat(kit): grid graph layout with right-angle routing, DiamondGraph`

### Task 7: Kit gallery, browser checks, axe, wiring

**Files:**
- Create: `apps/web/kit.html` and `apps/web/src/ui/kit/gallery/main.tsx`. `KitGallery` renders every component in every state.
  - Buttons: three variants, plus disabled.
  - Field: with help, with error.
  - Segmented, Tabs and Disclosure.
  - Notice: all three tones.
  - Toast: with Undo.
  - Numeral: plain, ember and null.
  - WaveTrack.
  - Frame, holding a sample pick.
  - CategoryMark: all 12 families plus null.
  - DangerMark: both levels.
  - RuledList.
  - Sheet, opened by a button.
  - DiamondGraph, showing the real War Plan offers and events branches with sample learned nodes.
- Create: `apps/web/tests/geometry.mjs`, exporting `checkGraph(page,root)`. It reads `data-graph-*` elements' bounding boxes and returns `{crossings:string[],overlaps:string[]}`. Path sampling splits subpaths on `M`, so gaps between subpaths aren't counted.
- Create: `apps/web/tests/kit.mjs`.
- Modify:
  - `apps/web/vite.config.ts`: `build.rollupOptions.input = {main:'index.html',kit:'kit.html'}`.
  - `apps/web/package.json`: devDependency `"@axe-core/playwright":"4.14.0"`.
  - `scripts/verify-local.sh`: run `node tests/kit.mjs` after `tests/e2e.mjs`, with the same `E2E_BASE_URL`.
  - `.github/workflows/v2-quality.yml`: browser job, `- run: node tests/kit.mjs` after `node tests/e2e.mjs`.
  - `docs/superpowers/specs/2026-10-23-visual-system-design.md` §2, kit gallery: "A separate page, `kit.html`, built with the app so CI can test it and never linked from it."

- [ ] **Step 1: Write `tests/kit.mjs`.** It loads `${base}kit.html` at 1440×900 and at 390×844, and asserts:
  - Axe reports no `serious` or `critical` violations (`new AxeBuilder({page}).analyze()`).
  - `Segmented`: focusing the checked radio and pressing ArrowRight checks the next one.
  - The help toggle flips `aria-expanded` to `true` and reveals the tip.
  - `Sheet` at 390: opening moves focus inside, Tab 20 times never leaves the dialog, and Escape closes and returns focus to the opener.
  - `checkGraph` returns no crossings and no overlaps.
  - The console shows no errors.
- [ ] **Step 2: Run it.** Build, then preview, then run: `npm run build && (npx vite preview --host 127.0.0.1 --port 4173 &) && E2E_BASE_URL=http://127.0.0.1:4173/ node tests/kit.mjs`. Expected: FAIL, `kit.html` 404.
- [ ] **Step 3: Implement** the gallery, the Vite input, and the axe install (`npm install --save-dev --save-exact @axe-core/playwright@4.14.0`).
- [ ] **Step 4: Run again.** Same command. Expected: `kit checks passed`. Fix components, not assertions.
- [ ] **Step 5: Run the full gate.** `make verify`. Expected: `LOCAL VERIFICATION PASSED`. Then confirm `dist/index.html` doesn't reference the gallery chunk: `grep -c gallery apps/web/dist/index.html` gives `0`.
- [ ] **Step 6: Commit.** `feat(kit): gallery page with browser, geometry and axe checks`

### Checkpoint: open PR 1

- [ ] **Push.** `git push git@github.com:RobRoyce/hordemind.git design/visual-system`
- [ ] **Open the PR.** `gh pr create --base main --title "feat: UI kit, tokens and e2e baseline (no visible change)"`.
  - The body lists Tasks 1–7.
  - It states that the e2e passed on today's screens at both widths.
  - It attaches kit gallery screenshots at both widths.
- [ ] **Wait for CI.** `gh pr checks <N> --watch` shows all jobs passing.
- [ ] **Hand off.** Give the owner `! gh pr merge <N> --squash --delete-branch`. Wait for the merge, then confirm the Pages deploy succeeded.

---

# PR 2: Screens (branch `feat/ui-screens` from updated `main`)

- [ ] **Branch.** `git checkout main && git pull --ff-only && git checkout -b feat/ui-screens`

### Task 8: `choiceSource` on recorded choices

**Files:**
- Modify: `apps/web/src/domain/schema.ts:55-63`. Add `choiceSource:z.enum(['default','picked']).nullable().default(null)` to the `offer_chosen` payload.
- Modify: `apps/web/src/domain/run.ts`. Add `DecisionInput.choiceSource?:'default'|'picked'` and pass it into the `offer_chosen` payload as `choiceSource:input.choiceSource??null`.
- Test: `apps/web/src/domain/run.test.ts`

**Interfaces:**
- Produces: `DecisionInput.choiceSource`, and `payload.choiceSource:'default'|'picked'|null` on `offer_chosen`.

- [ ] **Step 1: Write the failing tests.**

```ts
it('records whether the choice was the untouched default',()=>{
 const r=recordDecision(newRun(newProfile('Paladin','Paladin'),3),{offered:['A','B'],chosenIndex:0,recommendedOffer:'A',modelVersion:'m',choiceSource:'default'});
 expect(project(r).chosen[0]?.payload.choiceSource).toBe('default');
});
it('reads legacy choices without the field as null',()=>{
 const e=EventSchema.parse({...baseFields,type:'offer_chosen',payload:{wave:1,chosen:'A',chosenIndex:0,usedSpecial:false}});
 expect(e.type==='offer_chosen'&&e.payload.choiceSource).toBeNull();
});
```

  `baseFields` copies the event envelope that `append` builds in `run.ts:23`: `id` (a UUID), `runId`, `sequence`, `schemaVersion:1`, `clientVersion` and `at`. Import `EventSchema` from `./schema`.
- [ ] **Step 2: Run them.** `npx vitest run src/domain/run.test.ts`. Expected: the 2 new tests FAIL.
- [ ] **Step 3: Implement** the schema field and the pass-through.
- [ ] **Step 4: Run again.** `npx vitest run src/domain src/sync`. Expected: PASS, including the sync tests.
- [ ] **Step 5: Commit.** `feat(domain): record whether a choice was the pre-selected default`

### Task 9: Selection model

**Files:**
- Create: `apps/web/src/ui/live/selection.ts` and `selection.test.ts`

**Interfaces:**

```ts
export interface Selection{slot:number|null;source:'default'|'picked'|null}
export const NO_SELECTION:Selection
export function pick(slot:number):Selection                       // {slot,source:'picked'}
export function reconcile(sel:Selection,ctx:{filled:readonly boolean[];bestSlot:number|null;fresh:boolean}):Selection
```

- `reconcile` follows §4 "Pre-selection and recording":
  - A `picked` slot whose row is still filled is kept.
  - Otherwise, when `fresh` and `bestSlot` isn't null, the result is `{slot:bestSlot,source:'default'}`.
  - Otherwise, the result is `NO_SELECTION`.

- [ ] **Step 1: Write the failing tests.**
  - Defaults to the best when fresh.
  - Doesn't default while not fresh, so a stale result never selects.
  - Follows a new best when the selection is a default.
  - Keeps a player's pick when the best changes.
  - Drops a pick whose row was cleared, then falls back to the best.
  - Re-picking the best yields `source:'picked'`.
- [ ] **Step 2: Run them.** `npx vitest run src/ui/live/selection.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run again.** Same command. Expected: PASS, 6 tests.
- [ ] **Step 5: Commit.** `feat(live): selection model with pre-selected best`

### Task 10: Picker model

**Files:**
- Modify: `apps/web/src/catalog.ts:93`. Change it to `export const FAMILY_ORDER`.
- Create: `apps/web/src/ui/live/pickerModel.ts` and `pickerModel.test.ts`

**Interfaces:**

```ts
export interface CategoryTile{family:OfferFamily;count:number;only:OfferRef|null;likely:boolean}
export function categoryTiles(likely:OfferFamily|null):CategoryTile[]   // §5 order: count desc, ties by FAMILY_ORDER
export function offersIn(family:OfferFamily):OfferRef[]                 // alphabetical by label
export function likelyFamily(warPlanNodes:readonly string[],lastPick:string|null):OfferFamily|null // only with 'Method and Madness'
export function pactFamily(lastPick:string|null):OfferFamily|null
export const RECENT_IN_PICKER=4
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('orders categories by offer count, then the browsing order',()=>expect(categoryTiles(null).map(t=>t.family)).toEqual(['Masses','Spires','Hellborne','Monsters','Fiends','Lords','Player bane','Hellfire','Player boon','Council','Special boss','Chaos']));
it('single-offer categories carry their offer',()=>expect(categoryTiles(null).find(t=>t.family==='Chaos')?.only?.label).toBe('The Chaotic Offering'));
it('lists offers alphabetically',()=>expect(offersIn('Lords').map(o=>o.label)).toEqual(['The Enduring Lords','The Ruthless Lords','The Summoned Lords']));
it('hints the likely category only with Method and Madness',()=>{expect(likelyFamily(['Method and Madness'],'The Puffing Masses')).toBe('Masses');expect(likelyFamily([],'The Puffing Masses')).toBeNull()});
it('marks the likely tile without reordering',()=>{const t=categoryTiles('Lords');expect(t.map(x=>x.family)).toEqual(categoryTiles(null).map(x=>x.family));expect(t.filter(x=>x.likely).map(x=>x.family)).toEqual(['Lords'])});
it('the Pact opens at the last pick’s category',()=>{expect(pactFamily('The Rising Spires')).toBe('Spires');expect(pactFamily(null)).toBeNull()});
```

  Before writing the first test, confirm the expected order against `game-text.json` counts: Masses 11, Spires 9, Hellborne 6, Monsters 4, then 3 each for Fiends, Lords and Player bane, 2 each for Player boon and Hellfire, and 1 each for Council, Special boss and Chaos. Ties go by `FAMILY_ORDER`, which puts Hellfire before Player boon and Council, then Special boss, then Chaos. Write the expected array from that rule.
- [ ] **Step 2: Run them.** `npx vitest run src/ui/live/pickerModel.test.ts src/catalog.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run again.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(live): picker model for category-first entry`

### Task 11: App frame, navigation and toasts

**Files:**
- Create:
  - `apps/web/src/ui/shell/route.ts` and `route.test.ts`
  - `apps/web/src/ui/shell/toast.ts` and `toast.test.ts`
  - `apps/web/src/ui/shell/Footer.tsx` and `Footer.module.css`
  - `apps/web/src/ui/shell/App.module.css`
- Modify:
  - `apps/web/src/ui/App.tsx`. Replace the topbar and sidebar with `AppNav`, add `Footer` and `Toast`, rename the view `'strategy'` to `'character'`, and give `saveRun(run,message,undo?:()=>void)` an optional undo.
  - `apps/web/src/main.tsx`. Import `./ui/kit/fonts` and `./ui/kit/tokens.css` before `./ui/style.css`.
  - `apps/web/index.html`:
    - Title becomes `HordeMind`.
    - `theme-color` becomes `#1a1510`.
    - The favicon becomes a gold diamond on `#1a1510`, as an inline SVG data URI in the same style as today.
  - `App.module.css` sets the content column by view: Live Run 640px, Character 900px, Insights 720px, plus the 16px phone gutter.

**Interfaces:**
- `export type View='character'|'run'|'insights'`.
- `viewFromHash(hash:string):View` maps `#strategy` and `#character` to `'character'`, maps `#run` and `#insights` to themselves, and maps anything else to `'run'`.
- `export const ACTION_TOAST_MS=8000, PLAIN_TOAST_MS=2600`.
- `nextToast(message:string,action?:ToastAction):{message:string;action?:ToastAction;ms:number}`.
- `Footer({reportUrl})` shows the four items from §3.

- [ ] **Step 1: Write the failing tests.**
  - `viewFromHash('#strategy')==='character'` and `viewFromHash('#nope')==='run'`.
  - `nextToast('x',{label:'Undo',onClick})` gives `ms===8000`, and `nextToast('x')` gives `ms===2600`.
- [ ] **Step 2: Run them.** `npx vitest run src/ui/shell`. Expected: FAIL.
- [ ] **Step 3: Implement** the route and toast helpers, `Footer`, and the `App` changes.
  - Every navigation writes `#character`, `#run` or `#insights`.
  - Each new toast replaces the current one.
  - Old screens keep rendering inside the new frame.
- [ ] **Step 4: Run the tests and the journey.** `npx vitest run src/ui/shell && make verify`.
  - Expected: PASS. The e2e passes unchanged, because `navTo` matches `/^(Strategy Lab|Character)/` and `#strategy` still opens Character.
- [ ] **Step 5: Commit.** `feat(ui): new app frame, Character route, toasts with actions`

### Task 12a: Tap picker component

**Files:**
- Create: `apps/web/src/ui/live/OfferPicker.tsx` and `OfferPicker.module.css`. They replace `apps/web/src/ui/OfferPicker.tsx`.
- Move `Slot`, `emptySlot` and `slotFor` unchanged into `apps/web/src/ui/live/slot.ts`. Delete `familyClass`.

**Interfaces:**
- Consumes: `categoryTiles`, `offersIn`, `RECENT_IN_PICKER` (Task 10), `Sheet` and `useNarrow` (Task 5), `CategoryMark` (Task 4).
- Produces: `OfferPicker` with a `forwardRef<HTMLInputElement>` to the combobox input and these props:

```ts
{index:number;slot:Slot;recent:readonly string[];likely:OfferFamily|null;startFamily?:OfferFamily|null;
 total:number;onChange:(s:Slot)=>void;onPicked:()=>void;onOpenChange?:(open:boolean)=>void}
```

- Behavior (§5):
  - The input stays a `combobox` named `Offer ${index+1}`.
  - Focusing or clicking an empty input opens step 1. `startFamily` opens straight at step 2.
  - Typed text shows `searchOffers` results as `role="option"` items, as today.
  - The "record as unlisted" note and button stay.
  - `onPicked` fires after a pick, and the parent opens the next empty row.
  - `onOpenChange` reports open and closed, so the parent can suspend number shortcuts.

- [ ] **Step 1: Write the e2e steps first.** They go in the wave 1 section of `journey()` and will fail until Task 12c wires the picker.
  - Click `Offer 1`. Expect `getByRole('button',{name:/^Masses/})`. Click it. Click `getByRole('button',{name:/^The Puffing Masses/})`. Step 2 offers are buttons whose names start with the offer name. Assert `Offer 1` has the value `The Puffing Masses`, and that focus or the picker moved to `Offer 2`.
  - Fill `Offer 3` with `zzz` and press Escape. Assert the button named `record “zzz” as unlisted` exists, with today's copy, then clear the row.
  - These replace the "empty picker lists the whole catalog" step, because tap-first is a changed behavior. Cite this in the PR body.
- [ ] **Step 2: Implement** `OfferPicker` to the interface.
- [ ] **Step 3: Commit.** `feat(live): category-first tap picker`. The e2e runs in Task 12c.

### Task 12b: Recommendation pieces

**Files:**
- Create in `apps/web/src/ui/live/`:
  - `robustness.ts` and `robustness.test.ts`
  - `PickCard.tsx`, `EstimateDetails.tsx`, `PactAdvice.tsx`
  - a `.module.css` for each component

**Interfaces:**
- `robustnessLine(result:Comparison):string|null`, following §4:
  - `robust===true` gives `Holds under every timing assumption tested.`
  - `robust===false` gives `${winner} is best if ${scenario.toLowerCase()}.` It takes the first `sensitivity` name, in the recommended offer's list order, under which another modeled assessment's mean is higher.
  - `robust===null` gives `null`.
- `PickCard({result,runnerUp,busy})`. It uses `Frame label="Recommendation"`, with:
  - Label: "Best pick", or "Close call" when `robust===false`.
  - The offer name.
  - `+N Aether by run end, M more than [runnerUp]`.
  - `reasons[0]`.
  - The robustness line, labelled `Robustness`.
  - A high-danger line when the pick has a high-danger bane.
  - A `Disclosure` "Why this estimate" holding `EstimateDetails`.
- `EstimateDetails({estimate,reportUrl})` shows the remaining reasons, synergies, the 5–95% range, components, the sensitivity table, the assumptions, and the link `Something wrong? Report it`.
- `PactAdvice({pact})` renders `Notice tone="info" label="Black Pact advice"`.

- [ ] **Step 1: Write the failing tests** for `robustnessLine`.
  - The robust case.
  - `null`.
  - A case where `"Events take 40% longer"` makes B beat A, giving `B is best if events take 40% longer.`
  - A case where no scenario flips the result and `robust` is still `false`. It falls back to `Close call: the best offer changes under other timing assumptions.`
- [ ] **Step 2: Run them.** `npx vitest run src/ui/live/robustness.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the function and the three components.
- [ ] **Step 4: Run again.** Same command. Expected: PASS, 4 tests.
- [ ] **Step 5: Commit.** `feat(live): pick card, estimate details, robustness line`

### Task 12c: Live Run assembly

**Files:**
- Create in `apps/web/src/ui/live/`: `LiveRun.tsx` (exports `LiveRun` and `regularOffers`), `RunHeader.tsx`, `OfferSlot.tsx`, `RecordBar.tsx`, `EndRunPanel.tsx`, `StartRun.tsx`, and a `.module.css` for each.
- Delete: `apps/web/src/ui/LiveRun.tsx`, `OfferRecommendations.tsx`, `OfferPicker.tsx`.
- Modify: `apps/web/src/ui/App.tsx` imports, and `apps/web/tests/e2e.mjs`.

**Interfaces:**
- Consumes: `selection.ts` (Task 9), `pickerModel.ts` (Task 10), `OfferPicker` (Task 12a), `PickCard`, `PactAdvice` and `EstimateDetails` (Task 12b), and `saveRun(run,message,undo)` (Task 11).
- Recording passes `choiceSource:selection.source` (Task 8).
- Behavior is exactly §4:
  - Rows keep game order.
  - Each row has the label `Estimate for X` on its value. The best row is `gold`.
  - "Add the Black Pact offer" adds one row with `specialSlotIndex`. Its picker gets `startFamily=pactFamily(lastPick)`.
  - `RecordBar` sticks above the tabs below 700px. The button reads `Take [offer]` or `Choose the offer you took`.
  - The toast reads `Wave N: [offer] recorded` with Undo.
  - Number shortcuts are ignored while any picker is open.
  - The taken line carries `aria-label="Offers taken"`.

- [ ] **Step 1: Make the allowed e2e edits** in `journey()`.

  | Behavior | Edit |
  |---|---|
  | Pre-selection | After the wave 1 estimates land, assert `Choose offer N: [best]` has `aria-pressed="true"` before any key press. Read `[best]` from the `gold` row, or from the `Recommendation` region's `h2` or `h3`. |
  | `choiceSource` | After wave 1 is recorded by key `1`, the stored payload has `choiceSource:'picked'`. Record one later wave by clicking the pre-selected `Take …` without choosing, and assert `choiceSource:'default'`. |
  | Black Pact row | Replace the `Mark offer 2 as the Black Pact offer` click with: click `Add the Black Pact offer`, pick `The Anchored Masses` in the new row, choose that row and take it. `usedSpecial` becomes `true`, and `used before wave 2` appears. |
  | Tap-only run | Wave 3 enters every offer by taps only (category tile, then offer) and records with the `Take` button. |
  | Undo from toast | After a record, click the toast's `Undo`. The heading returns to the previous wave, and the offers are back. |

- [ ] **Step 2: Add the review-focus steps.**
  - At 390px, enter `The Summoned Hellborne (hunting you)` and assert `await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)`.
  - Open a picker, focus a tile, press `2`, and assert `Choose offer 2` is still `aria-pressed="false"`.
- [ ] **Step 3: Run it.** `make verify`. Expected: FAIL before assembly. The new steps can't find the new controls.
- [ ] **Step 4: Implement** the assembly. Delete the old files.
- [ ] **Step 5: Run again.** `make verify`. Expected: `LOCAL VERIFICATION PASSED`, with both viewports passing.
- [ ] **Step 6: Commit.** `feat(live): single-column Live Run on the kit`

### Task 13: Character page

**Files:**
- Create in `apps/web/src/ui/character/`: `Character.tsx` (exports `Character`, with the same props as today's `StrategyLab`), `CharacterTabs.tsx`, `CharacterForm.tsx`, `WarPlanTree.tsx`, `StartRunBar.tsx`, a `.module.css` for each, and `warPlanView.test.ts`.
- Delete: `apps/web/src/ui/StrategyLab.tsx`, `WarPlanTree.tsx`, `Help.tsx`.
- Modify: `apps/web/src/ui/App.tsx`, and `apps/web/tests/e2e.mjs` (add the geometry check only).

**Interfaces:**
- Consumes: `DiamondGraph` and `layoutGraph` (Task 6), `Segmented`, `Field`, `Tabs` and `PageHeader`.
- Produces: `warPlanGraphNodes(branch:'offers'|'events'):(GraphNodeInput&{name:string;note?:string})[]`, which builds `note` as `or ${exclusive}`. Also `countedUpgrades(learned:readonly string[]):number`, which excludes the `rewards` branch.
- Copy is exactly §7: labels, hints, the counter sentence, the Rewards line and "Start a N-wave run".
- The detail panel has fixed height, `role="region" aria-label="Upgrade details"`, and a link named `Tooltip or effect wrong? Report it`.
- `WarPlanTree` renders `role="group" aria-label="War Plan"`. Each branch's `DiamondGraph` gets `label` set to the branch title ("Offers and Chaos", "Aether events"), which is the text alternative from §8.
- Keep today's stranded-upgrades message, with its copy unchanged: "Saved before HordeMind followed the tree: …". It ignores Rewards nodes, as today.

- [ ] **Step 1: Write the failing tests** in `warPlanView.test.ts`.
  - `warPlanGraphNodes('offers')` has 7 nodes. `Reign in Hell` has the note `or Total Chaos`.
  - `countedUpgrades(['Exalted Council','Method and Madness'])===1`.
  - Rewards nodes are never in `warPlanGraphNodes`.
- [ ] **Step 2: Run them.** `npx vitest run src/ui/character`. Expected: FAIL.
- [ ] **Step 3: Implement** the page. In the e2e, after the War Plan clicks, call `checkGraph(page, page.getByRole('group',{name:'War Plan'}))` and assert no crossings and no overlaps.
- [ ] **Step 4: Run.** `npx vitest run src/ui/character && make verify`. Expected: PASS. `setChoice` now drives the radiogroups, with no other e2e edits.
- [ ] **Step 5: Commit.** `feat(character): Character page, segmented settings, diamond War Plan`

### Task 14: Insights page

**Files:**
- Create in `apps/web/src/ui/insights/`: `Insights.tsx` (same props as today), `RunHistory.tsx`, `SyncPanel.tsx` (moved and restyled, with logic unchanged), `ResearchNote.tsx`, and a `.module.css` for each.
- Delete: `apps/web/src/ui/Insights.tsx`, `apps/web/src/ui/SyncPanel.tsx`.

**Interfaces:**
- Copy is exactly §9. The summary sentence's numbers come from today's computations (`runs.length`, `totalDecisions`, `counted`).
- Export is `Button variant="secondary"` labelled `Export all runs`.

- [ ] **Step 1: Implement.** There's no new unit test, because this task is only presentation. The e2e already asserts `2 recorded choices` and the export download.
- [ ] **Step 2: Run.** `make verify`. Expected: PASS with no e2e edits. If `make verify-db` is available locally, run it too, since `SyncPanel` moved.
- [ ] **Step 3: Commit.** `feat(insights): ruled history and summary sentence`

### Task 15: Remove the old stylesheet, scan every screen, ship

**Files:**
- Delete: `apps/web/src/ui/style.css`, and its import in `main.tsx`.
- Modify: `apps/web/tests/e2e.mjs`. Add an axe scan (no `serious` or `critical` violations) on `#character`, on `#run` with offers entered, and on `#insights`, at both viewports.

- [ ] **Step 1: Add the axe scans and run.** `make verify`. Expected: FAIL only if a screen still relied on `style.css` or has violations. Fix the components.
- [ ] **Step 2: Delete `style.css` and run again.** `grep -rn "style.css\|className=\"[a-z]" apps/web/src/ui --include=*.tsx | grep -v module` finds no global class usages, and `make verify` passes.
- [ ] **Step 3: Take screenshots.** Capture every screen at 1440×900 and 390×844: Character, Live Run deciding, Live Run with the picker open, Live Run ended, and Insights. Save them to `.playwright-mcp/` (gitignored) for the PR.
- [ ] **Step 4: Commit.** `chore(ui): retire the global stylesheet, axe-scan every screen`
- [ ] **Step 5: Ship.**
  - Push `feat/ui-screens` and open the PR.
  - The body lists every e2e edit with the reason for each, as required by the spec's Delivery section.
  - Attach the screenshots.
  - Wait for green CI and give the owner the merge command.
  - After the merge, confirm the Pages deploy, and load the live site at both widths.
