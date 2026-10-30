# Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Wave by wave bar chart with a d3 fan chart, and redraw both War Plans on the Character screen in the game's own layout with the new node look, icons and motion.

**Architecture:** The replay keeps each sample's running total, so every scored run carries a fan. The import script adds the War Plan layouts from the game files to `src/data/war-plans.json`. The kit's `DiamondGraph` draws any tree from grid positions and an edge list, and the Character screen feeds it both War Plans through one shared `PlanTree`.

**Tech Stack:** React 19, TypeScript strict, CSS Modules with `--hm-*` tokens, Vitest 5 (`renderToStaticMarkup`), Playwright e2e, d3-scale and d3-shape, react-icons.

**Spec:** `docs/superpowers/specs/2026-10-28-visual-upgrade-design.md`

## Global Constraints

- Branch `feat/visual-upgrade`. One PR at the end, after the owner previews it on 127.0.0.1.
- Match the surrounding code style: dense one-space indentation, short names, few comments, present-tense doc comments.
- New dependencies, pinned exactly: `react-icons@5.7.0`, `d3-scale@4.0.2`, `d3-shape@3.2.0`; dev `@types/d3-scale@4`, `@types/d3-shape@3` (latest of each major, exact).
- Game data comes from the d4data commit the import script already pins (`76b722a340d22001171b4cfb0fc39e8efa761654`).
- Game names in user-facing copy carry their location, e.g. "Varshan's Vengeance (Lair Bosses War Plan)".
- Every animation stops under `prefers-reduced-motion: reduce`.
- The model's behaviour doesn't change. Only the six Lair Bosses upgrades in `LAIR_BOSS_NODES` affect a run.
- Never remove or disable the recommender.
- Full check: `make verify` from the repo root (build, Vitest, `tests/e2e.mjs` and `tests/kit.mjs` at desktop and phone sizes). Single test files: `cd apps/web && npx vitest run <path>`.
- Visual reference (read it, don't copy its hex colours): `/Users/rob/.claude/jobs/39387e06/tmp/mockups/trees.template.html` for the node look and `upgrade.template.html` for the fan chart.

## Review Focus

1. A profile saved before this change with a lone Lair Bosses upgrade, e.g. `['Infernal Deception']`, keeps it, shows the "Saved before HordeMind followed the tree" notice, and keeps it when another upgrade is clicked. Task 3 and Task 5 test this.
2. A run with one reading, or a reading HordeMind doesn't score (a Chaos Wave with Varshan's Vengeance learned), draws a fan with no `NaN` and says "Not scored". Task 2 tests this.
3. A 320 px phone (288 px content) shows the whole tree with no sideways scroll. Task 4 tests the layout, and Task 5 checks the page at 390 px.
4. Reduced motion stops the line draw and the node fade. Task 4 tests this in `tests/kit.mjs`.
5. Unknown names in `lairBossNodes` or `warPlanNodes` (corrupt or future data) never crash and are never shown as stranded. Task 3 tests this.

---

### Task 1: Fan data from the replay

**Files:**
- Modify: `apps/web/src/analysis/replay.ts` (`replaySpans`, lines 70–94)
- Modify: `apps/web/src/analysis/analyze.ts` (`RunScores`, `RunEntry`, the loop in `analyze`)
- Test: `apps/web/src/analysis/replay.test.ts`, `apps/web/src/analysis/analyze.test.ts`

**Interfaces:**
- Produces:
  - `interface FanPoint{wave:number;mean:number;p10:number;p25:number;p75:number;p90:number}` (exported from `replay.ts`)
  - `interface Replay{spans:SpanPrediction[];fan:FanPoint[]}`
  - `replayRun(r:RunReadings,samples:number,profile?:PlayerProfile,assumptions?:Assumptions):Replay`
  - `replaySpans` keeps its signature and returns `replayRun(...).spans`.
  - `RunScores` gains `fan:FanPoint[]` and `readings:{wave:number;total:number}[]`.

- [ ] **Step 1: Write the failing tests in `replay.test.ts`**, using the file's existing run fixtures:

```ts
it('starts the fan at zero and ends it at the last reading',()=>{
 const {fan}=replayRun(r,200);
 expect(fan[0]).toEqual({wave:0,mean:0,p10:0,p25:0,p75:0,p90:0});
 expect(fan.at(-1)!.wave).toBe(r.spans.at(-1)!.toWave);
 expect(fan).toHaveLength(r.spans.at(-1)!.toWave+1);
});
it('ends the fan at the sum of the span means',()=>{
 const {spans,fan}=replayRun(r,200);
 expect(fan.at(-1)!.mean).toBeCloseTo(spans.reduce((a,s)=>a+s.mean,0),6);
});
it('orders the fan percentiles at every wave',()=>{
 for(const f of replayRun(r,200).fan)expect(f.p10<=f.p25&&f.p25<=f.p75&&f.p75<=f.p90).toBe(true);
});
it('adds Council Aether only at the final wave of a completed run',()=>{
 const done=replayRun(completed,200).fan,left=replayRun({...completed,status:'abandoned'},200).fan;
 expect(done.slice(0,-1)).toEqual(left.slice(0,-1));
 expect(done.at(-1)!.mean).toBeGreaterThan(left.at(-1)!.mean);
});
it('keeps replaySpans equal to the spans of replayRun',()=>{
 expect(replaySpans(r,200)).toEqual(replayRun(r,200).spans);
});
```

`completed` is a completed run whose last reading is its final wave. Build it from the fixtures already in the file.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd apps/web && npx vitest run src/analysis/replay.test.ts`
Expected: FAIL, `replayRun` is not exported.

- [ ] **Step 3: Implement `replayRun` in `replay.ts`**

Use the same sample loop as `replaySpans`. Keep a per-sample running total at every wave from 1 to the last reading, excluding Council. Add the accumulated Council Aether to the last wave only under the existing condition (`r.status==='completed'&&r.spans.at(-1)?.toWave===r.totalWaves`). Percentile indices follow the existing convention: `p10=sorted[floor(0.1*(n-1))]`, `p25=sorted[floor(0.25*(n-1))]`, `p75=sorted[ceil(0.75*(n-1))]`, `p90=sorted[ceil(0.9*(n-1))]`. Wave 0 is all zeros.

- [ ] **Step 4: Run them and watch them pass**

Run: `cd apps/web && npx vitest run src/analysis/replay.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test in `analyze.test.ts`**

```ts
it('gives each scored run its fan and readings',()=>{
 const run=analyze(runs,profileId,200).character!.runs[0]!;
 expect(run.readings.at(-1)!.wave).toBe(run.fan.at(-1)!.wave);
 expect(run.readings.at(-1)!.total).toBe(run.scored.reduce((a,s)=>a+s.span.actual,0)); // only when nothing is skipped
 expect(run.fan[0]!.mean).toBe(0);
});
```

Use a fixture run with no Varshan's Vengeance, so `scored` equals all spans.

- [ ] **Step 6: Implement in `analyze.ts`**

`RunEntry` gains `fan:FanPoint[]|null`. A qualifying run calls `replayRun` once and passes `.spans` to `scoreRun`. `readings` are the running sums of `r.spans[].actual` at each `toWave`. The cache key doesn't change.

- [ ] **Step 7: Run the analysis tests**

Run: `cd apps/web && npx vitest run src/analysis`
Expected: PASS, including the existing cache tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/analysis
git commit -m "feat(analysis): keep the running-total fan for each scored run"
```

---

### Task 2: The fan chart

**Files:**
- Create: `apps/web/src/ui/insights/charts/FanChart.tsx`, `FanChart.test.tsx`
- Delete: `apps/web/src/ui/insights/charts/RangeStrip.tsx`, `RangeStrip.test.tsx`
- Modify: `apps/web/src/ui/insights/ReportCardSection.tsx:5,29`, `apps/web/src/ui/insights/charts/charts.module.css`, `apps/web/package.json`, `apps/web/package-lock.json`, `apps/web/tests/e2e.mjs:473-479`

**Interfaces:**
- Consumes: `RunScores.fan`, `RunScores.readings`, `RunScores.scored` (Task 1); `useTip`, `ChartTip`, `useChartWidth`, `NARROW_BELOW`, `runDate`, `Disclosure`.
- Produces:
  - `type Verdict='inside'|'below'|'above'`
  - `interface FanDot{wave:number;total:number;cx:number;cy:number;verdict:Verdict|null;lines:string[]}`
  - `fanLayout(run:RunScores,width:number):{width:number;height:number;ticks:number[];waves:number[];x:(w:number)=>number;y:(v:number)=>number;outer:string;inner:string;mean:string;you:string;dots:FanDot[];endYou:{y:number;text:string};endModel:{y:number;text:string}}`
  - `FanChart({runs}:{runs:RunScores[]})`, which renders nothing for an empty list.

- [ ] **Step 1: Install the d3 packages**

Run: `cd apps/web && npm install --save-exact d3-scale@4.0.2 d3-shape@3.2.0 && npm install --save-exact -D @types/d3-scale@4 @types/d3-shape@3`
Expected: `package.json` lists all four with exact versions.

- [ ] **Step 2: Write the failing tests in `FanChart.test.tsx`**

Build `RunScores` literals by hand: a 5-wave run with three readings, and a 1-reading run.

```ts
it('puts one dot per reading',()=>expect(fanLayout(run,640).dots).toHaveLength(run.readings.length));
it('keeps the end labels at least 16 px apart',()=>{
 const l=fanLayout(equalEnds,640); // last total equals the fan's last mean
 expect(Math.abs(l.endYou.y-l.endModel.y)).toBeGreaterThanOrEqual(16);
});
it('says a reading without a scored span was not scored',()=>{
 expect(fanLayout(withUnscored,640).dots.at(-1)!.lines.at(-1)).toMatch(/^Not scored/);
});
it('gives each reading its tooltip lines',()=>{
 expect(fanLayout(run,640).dots[0]!.lines.slice(0,4)).toEqual(['You had 120 Aether','After wave 1','Model expected about 110','80% range 80–150']);
});
it('draws a one-reading run without NaN',()=>{
 expect(renderToStaticMarkup(<FanChart runs={[oneReading]}/>)).not.toContain('NaN');
});
it('renders the axis, the legend and one table row per reading',()=>{
 const html=renderToStaticMarkup(<FanChart runs={[run]}/>);
 expect(html).toContain('>Start<');
 for(const t of ["Model's 80% range",'50% range',"Model's expected total",'Your total'])expect(html).toContain(t);
 expect(html.match(/<tr/g)).toHaveLength(run.readings.length+1);
});
it('renders nothing without runs',()=>expect(renderToStaticMarkup(<FanChart runs={[]}/>)).toBe(''));
```

Set the fixture numbers so the tooltip example above holds.

- [ ] **Step 3: Run them and watch them fail**

Run: `cd apps/web && npx vitest run src/ui/insights/charts/FanChart.test.tsx`
Expected: FAIL, the module is missing.

- [ ] **Step 4: Implement `FanChart.tsx`**

- **Size.** Height 240 below `NARROW_BELOW`, 300 above. Margins `L=44,R=80,T=12,B=28`.
- **Scales.** `x=scaleLinear([0,lastWave],[L,width-R])`. `y=scaleLinear([0,max(fan p90, readings total)],[height-B,T]).nice()`. `ticks=y.ticks(4)`.
- **Wave labels.** 0 is labelled "Start". Thin waves 1..N by the `RangeStrip` rule (`band>=22?1:band>=11?2:5`, always keep wave 1).
- **Paths.** `outer` is the p10–p90 area and `inner` the p25–p75 area. `mean` is the mean line. All three use `curveMonotoneX`. `you` is a `curveLinear` line through `{wave:0,total:0}` and every reading.
- **End labels.** "You {total}" and "Model {mean}" sit at `x(last)+8`, with baselines at `y+4`. When they are closer than 16 px, push both apart evenly around their midpoint.
- **Dots.** One per reading, `r=4.5`, ink fill, with `data-reading={wave}`. `verdict` comes from the `Scored` whose `span.toWave` equals the reading's wave (`actual<p10` is below, `>p90` is above). It is `null` when no `Scored` matches.
- **Tooltip lines.**
  - `You had {total} Aether`
  - `After wave {wave}`
  - `Model expected about {mean}`
  - `80% range {p10}–{p90}`
  - A verdict line. With a one-wave span it reads "This reading's gain was inside the model's range" (or "below", or "above"). With a longer span it reads "The gain over waves {from}–{to} was …". With no scored span it reads "Not scored, because Varshan's Vengeance (Lair Bosses War Plan) changes Chaos Waves".
  - All numbers use `Math.round`, as `RangeStrip` does.
- **Hit areas.** One per reading. Each spans the plot height, reaches halfway to the neighbouring readings and is at least 24 px wide. Use `hit(lines,cx,cy)`. While a tip shows, draw a dashed crosshair at `tip.x`.
- **Copy.** Heading "Wave by wave". Note: "The band is what the model expected for your running total, given the offers you took. Dots are your Aether readings. Hover or focus one to compare that reading's gain with the model." Keep the run stepper and its labels exactly as `RangeStrip` has them. SVG `role="group"` with `aria-label={`Wave by wave, ${label}`}`.
- **Legend.** "Model's 80% range", "50% range", "Model's expected total", "Your total".
- **Table.** In the "Show as a table" fold-out, the columns are Wave, You had, Model expected, 80% range, This reading's gain. The gain cell reads "Inside the range", "Below the range", "Above the range" or "Not scored".
- **CSS.** The 80% band is `var(--hm-gold)` at fill-opacity .13 and the 50% band at .2. The mean line is gold, 1.5 px, opacity .8. Your line is `var(--hm-ink)`, 2 px. Dots are ink with a 2 px `var(--hm-bg)` ring. The crosshair is `var(--hm-muted)` dashed `2 3`, and end labels are muted `--hm-text-1`. Delete the classes only `RangeStrip` used; grep `MissBars` and `OfferBars` first.

- [ ] **Step 5: Wire it in and remove `RangeStrip`**

`ReportCardSection.tsx` renders `<FanChart runs={analysis.runs}/>` where `RangeStrip` was. Delete `RangeStrip.tsx` and its test.

- [ ] **Step 6: Update the Insights e2e step**

In `tests/e2e.mjs`, replace the `[data-state]` assertion with these checks:
- At least one `[data-reading]` sits inside the `Wave by wave` group.
- Focusing the group's first `img` hit area shows text matching `/^You had \d+ Aether$/`.

Keep the stepper assertions.

- [ ] **Step 7: Run the unit tests and the full check**

Run: `cd apps/web && npx vitest run src/ui/insights && cd ../.. && make verify`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(insights): Wave by wave as a fan chart from the start of the run"
```

---

### Task 3: War Plan data and rules

**Files:**
- Modify: `scripts/import-game-text.mjs`
- Create: `apps/web/src/data/war-plans.json` (generated), `apps/web/src/domain/warPlans.ts`, `apps/web/src/domain/warPlans.test.ts`, `apps/web/src/domain/lairBossPlan.ts`, `apps/web/src/domain/lairBossPlan.test.ts`
- Modify: `apps/web/src/domain/profile.ts:13-18` (`toggleLairBossNode`) and its test

**Interfaces:**
- Produces:
  - `war-plans.json`: `{source:{repo,commit,build},plans:{infernalHordes:Plan,lairBosses:Plan}}`, where `Plan={nodes:{key:string;name:string;col:number;row:number;group:number|null;root:boolean;tooltip:string;seasonal:string}[];edges:[string,string][]}`
  - In `warPlans.ts`: `ROOT='root'`, `interface PlanNode` (the node shape above), `interface PlanGraph{nodes:readonly PlanNode[];edges:readonly (readonly [string,string])[]}`, `IH_GRAPH`, `LB_GRAPH`, `neighbors(g:PlanGraph,id:string):string[]`, `colSpan(g:PlanGraph):number`
  - In `lairBossPlan.ts`: `lairBossReachable(learned:readonly string[]):Set<string>`, `lairBossAvailable(learned:readonly string[],id:string):boolean`, `toggleLairBoss(learned:readonly string[],id:string):string[]`, `strandedLairBoss(learned:readonly string[]):string[]`

- [ ] **Step 1: Extend the import script**

For each plan, read `json/base/meta/SkillKit/{Warplans_InfernalHordes|Warplans_BossLair}.skl.json`. Each `arNodes` entry gives:
- `name` from `Power_{gbidReward.name}.stl.json` (labels `name`, `desc`, `warplan_seasonal_desc`), passed through `strip`. The root has no `gbidReward`. Give it `key:'root'`, `name:'root'` and `root:true`.
- `col=x/xStep`, with `xStep` 800 for Infernal Hordes and 1000 for Lair Bosses.
- `row=(y-rootY)/480`.
- The script throws if `col` or `row` isn't a whole number.
- `group` is `nExclusiveGroupId`, or `null` when it is -1.

`edges` hold `arConnections` index pairs mapped to names. Sort nodes by `row`, then `col`, and sort edges by name. Write `apps/web/src/data/war-plans.json` next to `game-text.json`, and add the counts to the console line.

- [ ] **Step 2: Generate the file**

Run: `make game-text` from the repo root.
Expected: `war-plans.json` is written. `git diff apps/web/src/data/game-text.json` is empty, because the commit is the same.

- [ ] **Step 3: Write the failing tests in `warPlans.test.ts`**

```ts
it('has 15 Infernal Hordes upgrades, a root, 17 connections and three choose-one pairs',()=>{
 expect(IH_GRAPH.nodes.filter(n=>!n.root)).toHaveLength(15);
 expect(IH_GRAPH.edges).toHaveLength(17);
 expect(groups(IH_GRAPH)).toEqual([['Bedlam','Pulse of Aether'],['Flawless Find','Forged in Flame'],['Reign in Hell','Total Chaos']]);
});
it('matches the parents and choose-one pairs in warplan.ts',()=>{
 const fromParents=WAR_PLAN.flatMap(n=>n.parents.length?n.parents.map(p=>key(p,n.id)):[key(ROOT,n.id)]).sort();
 expect(IH_GRAPH.edges.map(([a,b])=>key(a,b)).sort()).toEqual(fromParents);
 for(const n of WAR_PLAN)if(n.exclusive)expect(group(n.id)).toBe(group(n.exclusive));
});
it('has 17 Lair Bosses upgrades, a root, 21 connections and no choose-one groups',()=>{
 expect(LB_GRAPH.nodes.filter(n=>!n.root)).toHaveLength(17);
 expect(LB_GRAPH.edges).toHaveLength(21);
 expect(LB_GRAPH.nodes.every(n=>n.group===null)).toBe(true);
});
it('puts the root at row 0, column 0, and both trees in seven columns and seven rows',()=>{
 for(const g of [IH_GRAPH,LB_GRAPH]){
  expect(g.nodes.find(n=>n.root)).toMatchObject({row:0,col:0,name:ROOT});
  expect(colSpan(g)).toBe(6);
  expect(Math.max(...g.nodes.map(n=>n.row))).toBe(6);
 }
});
it('contains every Lair Bosses upgrade HordeMind reads',()=>{
 for(const n of LAIR_BOSS_NODES)expect(LB_GRAPH.nodes.some(x=>x.name===n.id),n.id).toBe(true);
});
it('keeps each warplan.ts tooltip a superset of the client text',()=>{
 for(const n of IH_GRAPH.nodes.filter(n=>!n.root))expect(norm(nodeById(n.name)!.tooltip)).toContain(norm(n.tooltip));
});
```

`key(a,b)` is the sorted pair joined by `|`, `groups` lists the names in each group (sorted), and `norm` collapses whitespace.

- [ ] **Step 4: Implement `warPlans.ts`**

The module imports the JSON and types `edges` as tuples.

- [ ] **Step 5: Write the failing tests in `lairBossPlan.test.ts`**

```ts
const NEXT_TO_ROOT=['Children of Zir',"Grigoire's Gambit",'Lair of Runes','Nemesis Tides','Out of the Cold','Two by Two',"Varshan's Vengeance"];
it('opens the seven upgrades next to the root at the start',()=>{
 expect(LB_GRAPH.nodes.filter(n=>!n.root&&lairBossAvailable([],n.name)).map(n=>n.name).sort()).toEqual(NEXT_TO_ROOT);
});
it('ignores a click on an upgrade with no learned neighbour',()=>expect(toggleLairBoss([],'Exotic Armory')).toEqual([]));
it('opens Exotic Armory from each of its three neighbours',()=>{
 for(const path of [['Nemesis Tides','Infernal Deception'],["Varshan's Vengeance",'Blood of Bartuc'],['Out of the Cold','Dog of Astaroth']])
  expect(lairBossAvailable(path,'Exotic Armory'),path.join(' > ')).toBe(true);
});
it('keeps upgrades that still have a path when one is unlearned',()=>{
 const learned=['Nemesis Tides','Infernal Deception','Exotic Armory','Blood of Bartuc',"Varshan's Vengeance"];
 expect(toggleLairBoss(learned,'Nemesis Tides')).toEqual(expect.arrayContaining(['Infernal Deception','Exotic Armory']));
});
it('drops upgrades that lose their last path',()=>{
 expect(toggleLairBoss(['Nemesis Tides','Infernal Deception','Exotic Armory'],'Nemesis Tides')).toEqual([]);
});
it('reports saved upgrades with no path instead of dropping them',()=>{
 expect(strandedLairBoss(['Infernal Deception'])).toEqual(['Infernal Deception']);
 expect(toggleLairBoss(['Infernal Deception'],'Lair of Runes')).toEqual(expect.arrayContaining(['Infernal Deception','Lair of Runes']));
});
it('does not let a stranded upgrade open its neighbours',()=>expect(lairBossAvailable(['Infernal Deception'],'Exotic Armory')).toBe(false));
it('ignores names outside the tree and the root',()=>{
 expect(toggleLairBoss(['Foo'],'Foo')).toEqual(['Foo']);
 expect(toggleLairBoss([],ROOT)).toEqual([]);
 expect(strandedLairBoss(['Foo'])).toEqual([]);
});
```

- [ ] **Step 6: Implement `lairBossPlan.ts`**

- **Reachable.** Breadth-first search from `ROOT` over `LB_GRAPH` edges, visiting only learned upgrades.
- **Available.** The upgrade is in the tree, isn't the root, isn't learned, and touches `ROOT` or a reachable upgrade.
- **Unlearning.** Remove the upgrade, then drop any upgrade that was reachable before the click and isn't after. Upgrades that were already unreachable stay, as `prune` keeps them in `warplan.ts`.
- **Learning.** Add the upgrade only when it is available.
- **Output order.** `LB_GRAPH` node order first, then names outside the tree in their original order.
- **Stranded.** Learned upgrades in the tree that aren't reachable.

- [ ] **Step 7: Point `toggleLairBossNode` at the new rules**

`toggleLairBossNode(profile,id)` returns `{...profile,lairBossNodes:toggleLairBoss(profile.lairBossNodes,id)}`. Update its existing test to learn `Nemesis Tides`, then `Infernal Deception`.

- [ ] **Step 8: Run the domain tests**

Run: `cd apps/web && npx vitest run src/domain`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/import-game-text.mjs apps/web/src/data/war-plans.json apps/web/src/domain
git commit -m "feat(domain): War Plan layouts from the game files and Lair Bosses neighbour rules"
```

---

### Task 4: The kit tree in the game layout, and the Infernal Hordes War Plan

**Files:**
- Modify: `apps/web/src/ui/kit/graphLayout.ts`, `graphLayout.test.ts`, `DiamondGraph.tsx`, `DiamondGraph.module.css`, `index.ts`, `tokens.css`, `gallery/KitGallery.tsx`
- Create: `apps/web/src/ui/kit/useElementWidth.ts` (the hook moved out of `ui/insights/charts/useChartWidth.ts`, which keeps `NARROW_BELOW` and re-exports the hook as `useChartWidth`)
- Modify: `apps/web/src/domain/warplan.ts` (drop `row`/`col`), `apps/web/src/ui/character/warPlanView.ts`, `warPlanView.test.ts`, `WarPlanTree.tsx`, `WarPlanTree.module.css`
- Modify: `apps/web/tests/e2e.mjs` (War Plan steps), `apps/web/tests/kit.mjs`

**Interfaces:**
- Consumes: `IH_GRAPH`, `ROOT`, `colSpan` (Task 3).
- Produces (kit):
  - `interface GraphNodeInput{id:string;row:number;col:number;root?:boolean;labelLines:number;labelWidth:number}`
  - `interface LayoutOptions{colWidth:number;rowHeight:number;radius:number;lineHeight:number;labelGap:number;pad:number;labels:boolean}`
  - `interface PlacedNode{id:string;x:number;y:number;r:number;root:boolean;label:Box|null}`
  - `interface Connector{from:string;to:string;points:readonly [readonly [number,number],readonly [number,number]]}`
  - `DEFAULT_LAYOUT={colWidth:112,rowHeight:116,radius:26,lineHeight:16,labelGap:8,pad:74,labels:true}`
  - `fitLayout(width:number,colSpan:number):LayoutOptions`, with radius 16, `labels:false`, `pad:20`, `colWidth=(width-40)/colSpan` and `rowHeight=Math.max(48,colWidth)`
  - `layoutGraph(nodes:readonly GraphNodeInput[],edges:readonly (readonly [string,string])[],o:LayoutOptions):GraphLayout`
  - `interface GraphNode extends GraphNodeInput{name:string;note?:string;mark?:string;icon?:ComponentType<{size?:number|string;className?:string}>}`
  - `DiamondGraph` props: `{nodes,edges,state,focused,onActivate,onFocusNode,label,describedBy?}`. The `layout` prop goes away.
  - `useElementWidth(ref):number`
- Produces (character):
  - `warPlanGraphNodes(charWidth?:number):GraphNode[]` covers every Infernal Hordes node, the root included.
  - `WAR_PLAN_EDGES=IH_GRAPH.edges`
  - `nodeState(learned,ROOT)` returns `'learned'`.
  - `countedUpgrades(learned)` counts every learned Infernal Hordes upgrade.

- [ ] **Step 1: Rewrite `graphLayout.test.ts` with failing tests**

```ts
it('places nodes on the grid from row and col',()=>{
 const l=layoutGraph([n('a',0,0),n('b',1,1)],[['a','b']],DEFAULT_LAYOUT);
 expect(at(l,'b').x-at(l,'a').x).toBe(112);expect(at(l,'b').y-at(l,'a').y).toBe(116);
});
it('draws each connection as a straight line between node centres',()=>{
 const l=layoutGraph([n('a',0,0),n('b',1,1)],[['a','b']],DEFAULT_LAYOUT);
 expect(l.connectors[0]!.points).toEqual([[at(l,'a').x,at(l,'a').y],[at(l,'b').x,at(l,'b').y]]);
});
it('draws the root larger and without a label',()=>{
 const root=at(layoutGraph([{...n('r',0,0),root:true}],[],DEFAULT_LAYOUT),'r');
 expect(root.r).toBe(32);expect(root.label).toBeNull();
});
it('shifts right so the widest label starts inside the graph',()=>{
 const l=layoutGraph([{...n('a',0,0),labelWidth:300}],[],DEFAULT_LAYOUT);
 expect(at(l,'a').label!.x).toBeGreaterThanOrEqual(0);
});
it('fits the content width with no labels',()=>{
 for(const w of [358,288]){
  const l=layoutGraph(sevenColumns,[],fitLayout(w,6));
  expect(l.width).toBeLessThanOrEqual(w);
  expect(l.nodes.every(x=>x.label===null)).toBe(true);
 }
});
```

`n(id,col,row)` gives one label line and a 60 px label width, and `sevenColumns` holds nodes at columns -3 to 3.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd apps/web && npx vitest run src/ui/kit/graphLayout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the new `layoutGraph` and `fitLayout`**

- **Placement.** `x=pad+(col-minCol)*colWidth`, plus the same left shift for wide labels that the current code uses. `y=radius+12+(row-minRow)*rowHeight`.
- **Root.** It has radius `radius+6` and no label.
- **Labels.** When `labels` is on, a label box starts `labelGap` below the node and holds `labelLines*lineHeight`.
- **Size.** The width is the larger of two values: the rightmost node's `x` plus `pad`, or the rightmost label edge plus 8. That mirrors the left side, so a fitted layout is exactly `width` wide. The height is the larger of the lowest node's bottom plus 12 and the lowest label edge plus 8.

- [ ] **Step 4: Run them and watch them pass**

Run: `cd apps/web && npx vitest run src/ui/kit/graphLayout.test.ts`
Expected: PASS.

- [ ] **Step 5: Redraw `DiamondGraph`**

- **Layout choice.** The graph measures its wrapper with `useElementWidth`. A phone (`useNarrow()`) gets `fitLayout(width,colSpan)`, where `colSpan` is max col minus min col. Everything else gets `DEFAULT_LAYOUT`, shrunk with a CSS `transform:scale(k)` (`k=min(1,width/layout.width)`, origin top left) on an inner box. The outer box is sized to the scaled width and height, so nothing scrolls sideways between 700 px and the full width.
- **SVG ids.** Ids come from `useId()` with everything except `[A-Za-z0-9_-]` stripped, so two graphs on one page never share a gradient.
- **Defs.**
  - a `rim` linear gradient from `--hm-frame-edge-top` to `--hm-frame-edge-bottom`
  - a dim rim gradient
  - core radial gradients: lit (`--hm-ember` → new token `--hm-ember-deep:#8c3a1c` → new token `--hm-ember-dark:#2a120c`), open and locked
  - a halo blur filter and a line-glow filter, both with `filterUnits="userSpaceOnUse"`
  - A filter sized to the line's own box clips straight horizontal and vertical lines to nothing.
- **Connector layers, in order.**
  1. a 6 px dark groove under every connector
  2. a 2 px `--hm-rule` wire (these paths carry `data-graph-edge`, `data-from` and `data-to`, with `d="M x y L x y"`)
  3. a top layer of lit connectors, 2.5 px `--hm-ember` with the glow filter
  - A connector is lit when both ends are learned, and the root counts as learned.
- **Node layers.** Each diamond has a halo, a rim, a core and an icon, with icon sizes 26 (root 30), or 16 (root 20) in a fitted layout.
  - Icons take `color`. Learned is the new token `--hm-warm-white:#fff1d6`, open is `--hm-gold`, and locked or excluded is `--hm-muted` at .38 opacity.
  - The focus ring is a gold diamond at `r+6`.
  - Each label has a plate in `--hm-bg` behind it. The text keeps `data-graph-label`, the name in a first `tspan`, and `note` or `mark` in a second.
  - The root has no button and no label.
- **Buttons.** One per non-root node. Each covers the node and its label, is at least `min(44,colWidth)` wide, and keeps today's ARIA (`aria-pressed`, `aria-disabled`, `aria-describedby` and a visually hidden name).
- **Motion.** Keep the previous learned set in a ref, initialised to the current set so the first render never animates.
  - A connector that just lit draws from its already-learned end over 520 ms. Its path length goes in `--len`, and the animation runs `stroke-dashoffset` from `--len` to 0.
  - A node that was just learned fades its core and halo in over 420 ms after a 260 ms delay.
  - `@media (prefers-reduced-motion:reduce)` sets `animation:none` on both.
- **Gallery.** `KitGallery.tsx` shows the Infernal Hordes tree through the new API.

- [ ] **Step 6: Switch the Character screen to one Infernal Hordes tree**

- `warplan.ts` loses `row` and `col`.
- `warPlanGraphNodes` builds nodes from `IH_GRAPH` positions and `WAR_PLAN` names, with the choose-one note `or {partner}`.
- `WarPlanTree.tsx` draws one `DiamondGraph` labelled "Infernal Hordes War Plan". Remove `BRANCHES`, the branch titles and the "Rewards branch … left out" note.
- The counter reads "{n} {upgrade|upgrades} learned. The game allows 7 points across all branches." and adds " Check your tree." when n exceeds 7.
- The stranded notice no longer filters out Rewards.
- The detail's open-state line becomes "Available to learn."
- Update `warPlanView.test.ts` to match: 16 nodes including the root, and Rewards counted.

- [ ] **Step 7: Update the browser tests**

- **`tests/e2e.mjs`.**
  - Both `checkGraph` calls take the group named `Infernal Hordes War Plan`.
  - The "arrow keys" step expects the node directly below Method and Madness in the game layout. Today that is Impending Doom, so confirm it.
- **`tests/kit.mjs`.**
  - Update gallery steps that used the old graph.
  - Add a reduced-motion check. With `page.emulateMedia({reducedMotion:'reduce'})`, learning a gallery node leaves the new lit path's computed `animationName` at `none`. Without the emulation it isn't `none`.

- [ ] **Step 8: Run the full check**

Run: `make verify` from the repo root.
Expected: PASS at both viewports, with no crossings and no overlaps reported by `checkGraph`.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(kit): War Plan trees in the game layout with the new node look and motion"
```

---

### Task 5: Lair Bosses tree, phone selection, icons and credits

**Files:**
- Create: `apps/web/src/ui/character/PlanTree.tsx`, `PlanTree.module.css` (styles moved from `WarPlanTree.module.css`), `LairBossTree.tsx`, `LairBossTree.test.tsx`, `lairBossView.ts`, `warPlanIcons.ts`, `warPlanIcons.test.ts`
- Delete: `apps/web/src/ui/character/LairBossBlock.tsx`, `LairBossBlock.module.css`, and the `LairBossBlock` test in `SplinterBlock.test.tsx`
- Modify: `WarPlanTree.tsx`, `Character.tsx:56`, `warPlanView.ts`, `apps/web/src/ui/shell/Footer.tsx`, `Footer.module.css`, `apps/web/package.json`, `apps/web/package-lock.json`, `apps/web/tests/e2e.mjs`

**Interfaces:**
- Consumes: `LB_GRAPH`, `neighbors`, `colSpan`, `ROOT` (Task 3); `lairBossAvailable`, `strandedLairBoss`, `toggleLairBossNode` (Task 3); `DiamondGraph`, `GraphNode` (Task 4).
- Produces:
  - `PlanTree({label,nodes,edges,state,onToggle,detail,stranded}:{label:string;nodes:readonly GraphNode[];edges:readonly (readonly [string,string])[];state:(id:string)=>NodeState;onToggle:(id:string)=>void;detail:(id:string)=>ReactNode;stranded:readonly string[]})`
  - `lairBossGraphNodes(charWidth?:number):GraphNode[]`
  - `lairBossState(learned:readonly string[],id:string):NodeState`
  - `type IconAuthor='Lorc'|'Delapouite'|'Skoll'|'Sbed'`
  - `interface PlanIcon{icon:IconType;name:string;author:IconAuthor}`
  - `PLAN_ICONS:Readonly<Record<string,PlanIcon>>`, keyed by node name, plus `IH_ROOT_ICON` and `LB_ROOT_ICON`
  - `ICON_AUTHORS:readonly IconAuthor[]=['Lorc','Delapouite','Skoll','Sbed']`

- [ ] **Step 1: Install react-icons**

Run: `cd apps/web && npm install --save-exact react-icons@5.7.0`

- [ ] **Step 2: Write the failing tests**

`warPlanIcons.test.ts`:

```ts
it('gives every War Plan upgrade an icon with an author',()=>{
 for(const g of [IH_GRAPH,LB_GRAPH])for(const n of g.nodes.filter(n=>!n.root)){
  expect(PLAN_ICONS[n.name],n.name).toBeDefined();
  expect(ICON_AUTHORS).toContain(PLAN_ICONS[n.name]!.author);
 }
});
```

`LairBossTree.test.tsx` uses `renderToStaticMarkup` with `newProfile('A','Paladin')`:

```ts
it('draws every Lair Bosses upgrade as a button',()=>expect(html.match(/data-graph-node=/g)).toHaveLength(17));
it('marks the six upgrades that change a Hordes run',()=>expect(html.match(/◆ Hordes/g)).toHaveLength(6));
it('warns about saved upgrades with no path',()=>{
 const p={...newProfile('A','Paladin'),lairBossNodes:['Infernal Deception']};
 expect(renderToStaticMarkup(<LairBossTree profile={p} onUpdate={()=>null}/>)).toContain('Saved before HordeMind followed the tree: Infernal Deception');
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `cd apps/web && npx vitest run src/ui/character`
Expected: FAIL.

- [ ] **Step 4: Implement `warPlanIcons.ts`**

Icons come from `react-icons/gi`. Each `name` is the icon's title on game-icons.net, e.g. "Tower flag" for `GiTowerFlag`.

| Node | Icon | Author |
|---|---|---|
| Infernal Hordes root | GiTowerFlag | Delapouite |
| Exalted Council | GiThroneKing | Delapouite |
| Council Coffers | GiLockedChest | Lorc |
| Forged in Flame | GiAnvil | Lorc |
| Flawless Find | GiGems | Lorc |
| Infernal Hoard | GiOpenTreasureChest | Skoll |
| Method and Madness | GiBrainstorm | Lorc |
| Reign in Hell | GiSharpCrown | Lorc |
| Impending Doom | GiSandsOfTime | Lorc |
| Total Chaos | GiVortex | Lorc |
| Pulse of Aether | GiPulse | Sbed |
| Bedlam | GiUnstableOrb | Lorc |
| The Black Pact | GiPentacle | Skoll |
| Cult of Annihilation | GiCultist | Skoll |
| Scale of Tathamet | GiDragonOrb | Delapouite |
| Devil's Deal | GiScrollUnfurled | Lorc |
| Lair Bosses root | GiCastle | Delapouite |
| Two by Two | GiTwoShadows | Lorc |
| Greater Nemesis | GiMagicPortal | Lorc |
| Ultimate Nemesis | GiStarAltar | Delapouite |
| Nemesis Tides | GiHighTide | Delapouite |
| Infernal Deception | GiDevilMask | Delapouite |
| Exotic Armory | GiSpikedArmor | Lorc |
| Dog of Astaroth | GiHound | Lorc |
| Out of the Cold | GiFrozenBody | Delapouite |
| Blood of Bartuc | GiBlood | Skoll |
| Varshan's Vengeance | GiFangedSkull | Lorc |
| Lair of Runes | GiRuneStone | Lorc |
| Lair of Plenty | GiOpenChest | Skoll |
| Golden Hoard | GiGoldStack | Delapouite |
| Duriel's Invasion | GiMaggot | Lorc |
| Grigoire's Gambit | GiBlackKnightHelm | Delapouite |
| Embers of Anguish | GiBurningEmbers | Lorc |
| Children of Zir | GiVampireDracula | Delapouite |

`warPlanGraphNodes` and `lairBossGraphNodes` set `icon` from this map.

- [ ] **Step 5: Implement `PlanTree.tsx`**

- **Contents.** It holds the stranded `Notice`, the `DiamondGraph`, the legend and the details region (`role="region"`, `aria-label={`${label} details`}`).
- **Stranded notice.** "Saved before HordeMind followed the tree: {names}. Learn an upgrade next to {it|them}, or click {it|them} to remove."
- **Details region.** It shows the hint "Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it." until a node is shown, then shows `detail(shown)`.
- **Desktop.** `onActivate` calls `onToggle`, and hover or focus shows the node.
- **Phone (`useNarrow()`).** `onActivate` only shows the node. The details region then adds a primary `Button`: "Learn {name}" when the node is open or excluded, "Unlearn {name}" when it is learned, and no button when it is locked.
- **Infernal Hordes.** `WarPlanTree.tsx` keeps its counter and its `Detail` content and moves the rest into `PlanTree`.

- [ ] **Step 6: Implement `lairBossView.ts` and `LairBossTree.tsx`**

- **Nodes.** `lairBossGraphNodes` gives the six `LAIR_BOSS_NODES` upgrades `mark:'◆ Hordes'`.
- **States.** `lairBossState` returns `'learned'` for the root and learned upgrades, `'open'` when `lairBossAvailable`, and `'locked'` otherwise.
- **Heading.** `LairBossTree` keeps the `SectionHeading` "Lair Bosses War Plan". Its lead reads "{LAIR_BOSS_HOME}. Learn the same upgrades you have in game. Upgrades marked ◆ Hordes change an Infernal Hordes run."
- **Detail panel.**
  - the name, then the client tooltip
  - the seasonal text, when present, as a muted paragraph
  - "In HordeMind:" followed by `{effect} {No effect on Aether.|Its effect on Chaos Wave Aether is unknown.}` for the six, or "It doesn't change an Infernal Hordes run, so HordeMind doesn't use it." for the rest
  - the state line: "Learned.", "Available to learn." or "Locked: learn {non-root neighbours joined with ' or '} first."
  - the same report link `WarPlanTree` uses
- **Wiring.** `Character.tsx` renders `LairBossTree` in place of `LairBossBlock`.

- [ ] **Step 7: Add the icon credits to the footer**

After "Offer text © Blizzard Entertainment.", add "Icons by Lorc, Delapouite, Skoll and Sbed from game-icons.net, CC BY 3.0." "game-icons.net" links to `https://game-icons.net/`, and "CC BY 3.0" links to `https://creativecommons.org/licenses/by/3.0/`. Below that, a kit `Disclosure` titled "Icon credits" lists one line per icon: "{node}, {Infernal Hordes|Lair Bosses} War Plan: {icon name} by {author}".

- [ ] **Step 8: Run the unit tests**

Run: `cd apps/web && npx vitest run`
Expected: PASS.

- [ ] **Step 9: Update `tests/e2e.mjs`**

- **Learning helper.** Add `learn(name)`. On a phone it clicks the node, then the "Learn {name}" button. On desktop it clicks the node. Use it wherever the War Plan steps click to learn.
- **Locked nodes.** On a phone, tapping The Black Pact while it's locked shows no "Learn The Black Pact" button. On desktop, keep the forced click.
- **Details region.** Change the queries to the region named `Infernal Hordes War Plan details`.
- **Lair Bosses step.**
  - `learn('Nemesis Tides')`, then `learn('Infernal Deception')`, then reload.
  - The stored `lairBossNodes`, sorted, equal `['Infernal Deception','Nemesis Tides']`, and Infernal Deception is `aria-pressed="true"`.
- **Geometry.** The `checkGraph` loop covers `Infernal Hordes War Plan` and `Lair Bosses War Plan`.
- **Phone width.** At phone size, `document.documentElement.scrollWidth<=innerWidth` on the Character screen.
- **Credits.** Opening "Icon credits" shows "Varshan's Vengeance, Lair Bosses War Plan: Fanged skull by Lorc".

- [ ] **Step 10: Run the full check**

Run: `make verify` from the repo root.
Expected: PASS at both viewports.

- [ ] **Step 11: Commit**

```bash
git add apps/web
git commit -m "feat(character): Lair Bosses War Plan tree, tap-to-select on phones, Game Icons with credits"
```
