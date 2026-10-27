# Learn From Your Runs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the active Season 15 splinter and Lair Bosses War Plan nodes, replay recorded runs to score the model, and fit kill speed, travel time, Mass health and event spawn rate to each player's Aether readings.

**Architecture:** Three phases, one PR each. Phase A changes the profile and its Character screen. Phase B adds `src/analysis/`, which reads recorded runs into spans, replays them through the existing simulator, and feeds the Insights screen through a second worker. Phase C adds a grid-search calibration on top of the replay, caches results in browser storage, and passes calibrated numbers into Live Run estimates.

**Tech Stack:** React 19, TypeScript 7 (strict), Zod 4, Vite 8, Vitest 5, Playwright 1.64 (`tests/e2e.mjs`), CSS Modules with `--hm-*` tokens.

**Spec:** `docs/superpowers/specs/2026-10-26-learn-from-runs-design.md`

## Global Constraints

- Nothing is uploaded. All analysis runs in the browser. Private sync behavior is unchanged, and fitted numbers never sync.
- No new dependencies.
- `profile_schema_version` stays 1. No database migration.
- `RECOMMENDER_VERSION` stays `s15-timeflow-3.1-experimental`. Calibrated comparisons report `s15-timeflow-3.1-experimental+calibrated`.
- Splinter ranks are integers 0–24.
- Every game name in UI copy carries its location or a one-line description (owner rule, 2026-10-26).
- Match the repo's style: one-space indent, compact expressions, short present-tense comments.
- Run `make verify` before every push. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The owner sees each phase's UI on 127.0.0.1 before its PR. Merge only when the owner asks.
- Don't stack PRs. Phase B starts from `main` after PR A merges, and Phase C after PR B merges.

## Review Focus

1. **A profile synced from another device carries both `splinterRank` and the new fields.** The explicit new fields must win, so a migration never resets a Destruction player to Terror. Task A1 tests this.
2. **A character with zero qualifying runs, only in-progress runs, or runs whose only reading is the final total.** Insights shows each section's empty state and never throws. Tasks B1 and B6 test this.
3. **History contains free text the catalog doesn't know.** Its span has no family, so it stays out of the family breakdown, and the replay counts it toward stack size only. Task B3 tests this.
4. **The active character changes while the worker is still computing.** Insights must not show the previous character's report card under the new name. Task B6 tests this.
5. **Browser storage throws** (private mode, or quota exceeded). Calibration still computes and estimates still work, without a cache. Task C5 tests this.

---

## Phase A: Profile changes (PR 1)

Branch `feat/splinters-and-lair-bosses`, created from `docs/learn-from-runs-spec`, so PR 1 carries the spec and this plan.

### Task A1: Splinter and Lair Bosses data, profile fields, legacy migration

**Files:**
- Create: `apps/web/src/domain/splinters.ts`
- Modify: `apps/web/src/domain/schema.ts:11-29` (profile schema)
- Modify: `apps/web/src/domain/run.ts:7-9` (`newProfile`)
- Modify: `apps/web/src/domain/profile.ts` (add `toggleLairBossNode`)
- Test: `apps/web/src/domain/splinters.test.ts`

**Interfaces:**
- Produces:
  - `type SplinterId='terror'|'destruction'|'hatred'`
  - `SPLINTER_IDS`
  - `SPLINTER_MAX_RANK=24`
  - `interface SplinterBonus{rank:number;node:string;where:string;effect:string;note:string}`
  - `interface Splinter{id:SplinterId;name:string;bonuses:readonly SplinterBonus[];noHordes?:string}`
  - `SPLINTERS:readonly Splinter[]`
  - `interface LairBossNode{id:string;where:string;effect:string;aether:'none'|'unknown'}`
  - `LAIR_BOSS_NODES:readonly LairBossNode[]`
  - `LAIR_BOSS_HOME`
  - `terrorRank(p:Pick<CharacterProfile,'activeSplinter'|'splinterRanks'>):number`
  - `migrateSplinterRank(raw:unknown):unknown`, exported from `schema.ts`
  - `toggleLairBossNode(profile:CharacterProfile,id:string):CharacterProfile`
  - New `CharacterProfile` fields `activeSplinter`, `splinterRanks:{terror,destruction,hatred}` and `lairBossNodes`. `splinterRank` is gone from the output type.

- [ ] **Step 1: Write the failing tests**

```ts
const base=()=>({...newProfile('A','Paladin'),updatedAt:'2026-10-26T00:00:00.000Z'});
it('an old splinterRank becomes an active Terror rank',()=>{
 const p=CharacterProfileSchema.parse({...base(),activeSplinter:undefined,splinterRanks:undefined,splinterRank:20});
 expect(p.activeSplinter).toBe('terror');
 expect(p.splinterRanks).toEqual({terror:20,destruction:null,hatred:null});
 expect('splinterRank' in p).toBe(false);
});
it('explicit splinter fields win over a legacy rank',()=>{
 const p=CharacterProfileSchema.parse({...base(),splinterRank:5,activeSplinter:'destruction',splinterRanks:{terror:12,destruction:20,hatred:null}});
 expect(p.activeSplinter).toBe('destruction');
 expect(p.splinterRanks.terror).toBe(12);
});
it('ranks stop at 24',()=>{
 expect(CharacterProfileSchema.safeParse({...base(),splinterRanks:{terror:24,destruction:null,hatred:null}}).success).toBe(true);
 expect(CharacterProfileSchema.safeParse({...base(),splinterRanks:{terror:25,destruction:null,hatred:null}}).success).toBe(false);
});
it('run snapshots migrate too',()=>{
 // A run_started event whose payload.profile is a legacy profile with splinterRank 14.
 expect(EventSchema.parse(legacyStart).payload.profile.splinterRanks.terror).toBe(14);
});
it('Terror bonuses count only while Terror is active',()=>{
 expect(terrorRank({activeSplinter:'terror',splinterRanks:{terror:14,destruction:null,hatred:null}})).toBe(14);
 expect(terrorRank({activeSplinter:'destruction',splinterRanks:{terror:20,destruction:20,hatred:null}})).toBe(0);
 expect(terrorRank({activeSplinter:'terror',splinterRanks:{terror:null,destruction:null,hatred:null}})).toBe(0);
});
it('Lair Bosses nodes toggle on and off',()=>{
 const p=toggleLairBossNode(newProfile('A','Paladin'),'Infernal Deception');
 expect(p.lairBossNodes).toEqual(['Infernal Deception']);
 expect(toggleLairBossNode(p,'Infernal Deception').lairBossNodes).toEqual([]);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd apps/web && npx vitest run src/domain/splinters.test.ts`
Expected: FAIL, because `./splinters` doesn't exist.

- [ ] **Step 3: Implement**

`schema.ts`:
- Replace `splinterRank` with three fields:
  - `activeSplinter:z.enum(SPLINTER_IDS).nullable().default(null)`
  - `splinterRanks:z.object({terror:Rank,destruction:Rank,hatred:Rank}).default({terror:null,destruction:null,hatred:null})`
  - `lairBossNodes:z.array(z.string().max(100)).default([])`
- `Rank` is `z.number().int().min(0).max(SPLINTER_MAX_RANK).nullable().default(null)`.
- Wrap the object as `z.preprocess(migrateSplinterRank,z.object({...}))`.
- `migrateSplinterRank` acts only on an object whose `splinterRank` is a number and whose `splinterRanks?.terror` is null or missing. For that object it:
  - copies the rank into `splinterRanks.terror`, keeping the other two ranks
  - sets `activeSplinter` to `'terror'` when it's null or missing
- Zod strips the leftover `splinterRank`. Update the doc comment above the fields.

`splinters.ts`:
- `LAIR_BOSS_HOME` is `'War Plans table in Temis, Skovos → Activities → Lair Bosses'`.
- `SPLINTERS` and `LAIR_BOSS_NODES` use the copy below. It comes from the spec's tables, with the location in `where`.

| Splinter | rank | node | where | effect | note |
|---|---|---|---|---|---|
| Splinter of Terror | 5 | Cult of Annihilation | First node of the events branch in the Infernal Hordes War Plan | A Doomsayer appears at the start of each wave. | Not modeled: Doomsayer Aether is unpublished. |
| | 14 | Impending Doom | Second row of the offers branch in the Infernal Hordes War Plan | Impending Doom also triggers with 30 seconds left. | Included in estimates. |
| | 20 | Council Coffers | Second node of the rewards branch in the Infernal Hordes War Plan | The Chest of Talismans costs 1 Aether. | Rewards only; it doesn't change estimates. |
| Splinter of Destruction | 14 | Lair of Runes | Next to the root of the Lair Bosses War Plan | Lair Bosses drop additional Runes. | Reaches a Hordes run only through Belial's ambush (Infernal Deception). |
| | 20 | Exotic Armory | Three steps from the root of the Lair Bosses War Plan | Hoard Chests drop 3 more Unique Items for any class. | Reaches a Hordes run only through Belial's ambush (Infernal Deception). |
| Splinter of Hatred | — | — | — | — | `noHordes`: "No Infernal Hordes bonus. Its bonuses act in Nightmare Dungeons, the Pit and Whispers." |

`LAIR_BOSS_NODES` has six entries, all with `aether:'none'` except Varshan's Vengeance, which has `'unknown'`. Use the spec's "Lair Bosses War Plan nodes" table, writing `where` as a full phrase, such as "Next to the root of the Lair Bosses War Plan".

Other changes:
- `newProfile` sets `activeSplinter:null`, `splinterRanks:{terror:null,destruction:null,hatred:null}` and `lairBossNodes:[]`, and drops `splinterRank`.
- `toggleLairBossNode` adds or removes the id, keeping `LAIR_BOSS_NODES` order.

- [ ] **Step 4: Run the tests and typecheck**

Run: `cd apps/web && npx vitest run src/domain && npx tsc --noEmit`
Expected: the domain tests pass. Type errors remain only at the `splinterRank` reads that Tasks A2 and A3 replace (`scenario.ts`, `model.ts`, `simulate.ts`, `Character.tsx`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domain
git commit -m "feat: store the active splinter, three splinter ranks and Lair Bosses nodes"
```

### Task A2: Terror bonuses follow the active splinter

**Files:**
- Modify: `apps/web/src/recommendation/simulate.ts:15,183`
- Modify: `apps/web/src/recommendation/model.ts:17,156`
- Modify: `apps/web/src/recommendation/scenario.ts`
- Test: `apps/web/src/recommendation/scenario.test.ts` (new). Also update `simulate.test.ts:54,75` and `model.test.ts:243-244`.

**Interfaces:**
- Consumes: `terrorRank` (A1)
- Produces:
  - `PlayerProfile.terrorRank?:number|null`, replacing `splinterRank`
  - `Scenario.profile:Pick<CharacterProfile,'killSpeed'|'mobility'|'warPlanNodes'>&{terrorRank?:number|null}`
  - `playerProfile(p:CharacterProfile):Scenario['profile']`, exported from `scenario.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('the 30-second Doom trigger needs Terror active',()=>{
 const terror={...newProfile('A','Paladin'),warPlanNodes:['Method and Madness','Impending Doom'],activeSplinter:'terror' as const,splinterRanks:{terror:20,destruction:null,hatred:null}};
 expect(scenarioFromRun(newRun(terror,10)).profile.terrorRank).toBe(20);
 expect(scenarioFromRun(newRun({...terror,activeSplinter:'destruction'},10)).profile.terrorRank).toBe(0);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd apps/web && npx vitest run src/recommendation/scenario.test.ts`
Expected: FAIL, because `terrorRank` is undefined on the scenario profile.

- [ ] **Step 3: Implement**

- Rename the field in `PlayerProfile` and `Scenario.profile`, and read `profile.terrorRank` at `simulate.ts:183` and `model.ts:156`.
- `playerProfile` returns `{killSpeed,mobility,warPlanNodes:[...],terrorRank:terrorRank(p)}`, and `scenarioFromRun` uses it.
- In the existing tests, replace `splinterRank:` with `terrorRank:`.

- [ ] **Step 4: Run the recommendation tests**

Run: `cd apps/web && npx vitest run src/recommendation`
Expected: PASS. The existing rank-14 tests pass unchanged after the rename.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/recommendation
git commit -m "feat: apply Terror's War Plan bonuses only while Terror is active"
```

### Task A3: Character screen splinter and Lair Bosses blocks

**Files:**
- Create: `apps/web/src/ui/character/splinterView.ts`
- Create: `apps/web/src/ui/character/SplinterBlock.tsx`, `SplinterBlock.module.css`
- Create: `apps/web/src/ui/character/LairBossBlock.tsx`, `LairBossBlock.module.css`
- Modify: `apps/web/src/ui/character/Character.tsx:46-66`
- Modify: `apps/web/src/ui/character/CharacterForm.tsx` (`TIPS.splinter`)
- Modify: `apps/web/tests/e2e.mjs` (new step after the War Plan step)
- Modify: `docs/UX_V2.md`, plus `README.md` if it mentions the splinter rank
- Test: `apps/web/src/ui/character/splinterView.test.ts`, `SplinterBlock.test.tsx`

**Interfaces:**
- Consumes: `SPLINTERS`, `LAIR_BOSS_NODES`, `LAIR_BOSS_HOME`, `toggleLairBossNode` (A1)
- Produces:
  - `bonusState(profile:CharacterProfile,splinter:SplinterId,rank:number):'active'|'reached'|'locked'`
  - `parseRank(text:string):number|null|undefined`, where `undefined` means invalid input to ignore
  - `SplinterBlock({profile,onUpdate}:{profile:CharacterProfile;onUpdate:(patch:Partial<CharacterProfile>)=>void})`
  - `LairBossBlock({profile,onUpdate}:{profile:CharacterProfile;onUpdate:(p:CharacterProfile)=>string|null})`

- [ ] **Step 1: Write the failing tests**

```ts
it('a bonus is active only on the active splinter at its rank',()=>{
 const p={...newProfile('A','Paladin'),activeSplinter:'destruction' as const,splinterRanks:{terror:20,destruction:14,hatred:null}};
 expect(bonusState(p,'destruction',14)).toBe('active');
 expect(bonusState(p,'destruction',20)).toBe('locked');
 expect(bonusState(p,'terror',5)).toBe('reached');
});
it('rank input clamps to 0–24 and treats empty as not set',()=>{
 expect(parseRank('')).toBeNull();
 expect(parseRank('30')).toBe(24);
 expect(parseRank('-2')).toBe(0);
 expect(parseRank('abc')).toBeUndefined();
});
it('inactive splinters say their bonuses apply while active, and Hatred says it has none',()=>{
 const html=renderToStaticMarkup(<SplinterBlock profile={{...newProfile('A','Paladin'),activeSplinter:'terror'}} onUpdate={()=>{}}/>);
 expect(html).toContain('Applies while active');
 expect(html).toContain('No Infernal Hordes bonus.');
 expect(html).toContain('First node of the events branch in the Infernal Hordes War Plan');
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd apps/web && npx vitest run src/ui/character`
Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: Implement**

`SplinterBlock`:
- A `Segmented` labelled "Active splinter" with the options None, Terror, Destruction and Hatred. The value `'none'` maps to `null`.
- Three `NumberField`s labelled "Splinter of Terror rank", "Splinter of Destruction rank" and "Splinter of Hatred rank", with `min={0}`, `max={24}` and placeholder "Not set". Each saves through `parseRank`.
- Under each splinter, a list of its bonuses. Each item reads "Rank {rank}: {node}, {where}. {effect} {note}".
- `bonusState` drives each item's state class. `'reached'` items on an inactive splinter add "Applies while active".
- The new `TIPS.splinter` reads "Each Season 15 splinter has its own rank, from 0 to 24. Only the active splinter's War Plan bonuses apply."

`LairBossBlock`:
- `SectionHeading` "Lair Bosses War Plan".
- The lead reads `${LAIR_BOSS_HOME}. Only the nodes that change an Infernal Hordes run are listed.`
- One kit `Checkbox` per node, labelled with the node's id. Under each, a line reading "{where}. {effect}", followed by "No effect on Aether." or "Its effect on Chaos Wave Aether is unknown."

`Character.tsx`:
- `SplinterBlock` replaces the splinter `Field` inside `WarPlanTree`.
- A new `<section aria-label="Lair Bosses War Plan setup">` holding `LairBossBlock` goes after the War Plan section.

- [ ] **Step 4: Add the e2e step**

In `tests/e2e.mjs`, after the War Plan assertions:
1. Run `setChoice(page,'Active splinter','Terror')`.
2. Fill "Splinter of Terror rank" with 14 and "Splinter of Destruction rank" with 20.
3. Check the "Infernal Deception" checkbox.
4. Reload the page.
5. Assert that `(await stored()).profiles[0]` includes `{activeSplinter:'terror',splinterRanks:{terror:14,destruction:20,hatred:null},lairBossNodes:['Infernal Deception']}`.

- [ ] **Step 5: Verify**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit && bash /Users/rob/.claude/jobs/39387e06/tmp/e2e.sh`
Expected: all pass. The e2e log shows the new step.

- [ ] **Step 6: Update the docs and commit**

Update the Character screen description in `docs/UX_V2.md`.

```bash
git add apps/web docs
git commit -m "feat: splinter and Lair Bosses War Plan blocks on the Character screen"
```

- [ ] **Step 7: Owner preview and PR**

1. Run `make verify`.
2. Serve the build on 127.0.0.1 and send the owner the URL and screenshots at 1440 and 390 px.
3. After the owner's OK, push with `git push git@github.com:RobRoyce/hordemind.git feat/splinters-and-lair-bosses` and open PR 1.

### Task A4: One rank for the active splinter (owner preview, 2026-10-26)

The owner asked for one selector between the three splinters and one rank field, with help text for the active splinter only. Spec §1 is updated to match.

**Files:**
- Modify: `apps/web/src/domain/schema.ts`, `splinters.ts`, `run.ts`
- Modify: `apps/web/src/ui/character/splinterView.ts`, `SplinterBlock.tsx`, `SplinterBlock.module.css`, `CharacterForm.tsx` (`TIPS.splinter`)
- Modify: tests that build profiles with `splinterRanks` (`domain/merge.test.ts`, `domain/splinters.test.ts`, `recommendation/scenario.test.ts`, `ui/character/*.test.ts*`), plus `tests/e2e.mjs` and `docs/UX_V2.md`

**Interfaces:**
- `CharacterProfile.splinterRank:number|null`, the active splinter's rank from 0 to 24, replaces `splinterRanks`
- `migrateSplinterRank(raw)` sets `activeSplinter:'terror'` only when the object has no `activeSplinter` key and `splinterRank` is a number
- `terrorRank(p:Pick<CharacterProfile,'activeSplinter'|'splinterRank'>):number`
- `SplinterBonus.learnedIn:'warPlanNodes'|'lairBossNodes'|null`, where Council Coffers is `null`
- `type BonusState='active'|'unlearned'|'locked'`
- `bonusState(p:Pick<CharacterProfile,'splinterRank'|'warPlanNodes'|'lairBossNodes'>,bonus:SplinterBonus):BonusState`
- `chooseSplinter(p:Pick<CharacterProfile,'activeSplinter'|'splinterRank'>,id:SplinterId):Pick<CharacterProfile,'activeSplinter'|'splinterRank'>`, which clears the rank when the splinter changes

The full brief is `task-A4-brief.md` in the plan workspace.

---

## Phase B: Replay, report card, override tracker, counts (PR 2)

Branch `feat/run-insights`, created from `main` after PR 1 merges.

### Task B1: Read a recorded run into spans

**Files:**
- Create: `apps/web/src/analysis/replay.ts` (reading half)
- Test: `apps/web/src/analysis/replay.test.ts`

**Interfaces:**
- Consumes:
  - `effectiveEvents` (`domain/run.ts`)
  - `playerProfile` (A2)
  - `mechanicsFor` (`recommendation/mechanics.ts`)
- Produces:
  - `interface Span{fromWave:number;toWave:number;actual:number;chaos:boolean}`
  - `interface ReplayWave{wave:number;stack:string[];chaos:boolean;newPickIndex:number}`
  - `type LeftOut='pulse'|'events'`
  - `interface RunReadings{runId:string;profileId:string;difficulty:CharacterProfile['difficulty'];createdAt:string;status:RunRecord['status'];profile:PlayerProfile;lairBossNodes:string[];waves:ReplayWave[];spans:Span[];scored:Span[];skipped:{falling:number;legacy:number;varshanChaos:number};leftOut:LeftOut|null}`
  - `readRun(run:RunRecord):RunReadings`

Rules, copied from spec section 2:
- A reading is an `aether_observed` total. A completed run's `run_finished.finalAether` also counts, as the reading after `totalWaves`.
- Readings are sorted by wave. The total before wave 1 is 0.
- A `null` total merges into the next span.
- A total lower than the previous accepted total is skipped and counted in `skipped.falling`.
- Each `wave_observed` event adds 1 to `skipped.legacy`.
- A span's `chaos` is true when any of its waves follows a Chaos-category pick.
- `scored` excludes chaos spans when `lairBossNodes` includes "Varshan's Vengeance". `skipped.varshanChaos` is `spans.length-scored.length`.
- `leftOut` is `'events'` when the snapshot's `warPlanNodes` includes Cult of Annihilation, Scale of Tathamet or Devil's Deal. Otherwise it's `'pulse'` when they include Pulse of Aether, and otherwise `null`.
- `waves` runs from 1 to the last span's `toWave`. Wave *w*'s stack holds the picks for waves 1..*w* in order, and `newPickIndex` is the position of wave *w*'s pick.

- [ ] **Step 1: Write the failing tests**

Build runs with `newRun`, `recordDecision` and `endRun`. Edit a reading's payload directly to fake data the domain would reject. Use these tests:
- `spans run between consecutive readings, starting from zero`. A 4-wave run has readings 40, 90, missed, and a final total of 200. The spans must equal `[{1,1,40,false},{2,2,50,false},{3,4,110,false}]`.
- `a falling total is skipped and its span merges onward`. Readings 40, 30 and 120 give spans `[{1,1,40},{2,3,80}]`, with `skipped.falling===1`.
- `undone readings are ignored`. A reading removed by `undoChoice` doesn't appear.
- `legacy readings are counted, not used`. One `wave_observed` gives `skipped.legacy===1` and no extra span.
- `runs with Pulse of Aether or an events-branch node are left out`, with expectations `'pulse'` and `'events'`.
- `with Varshan's Vengeance, Chaos Wave spans are not scored`. Picking 'The Chaotic Offering' before wave 2 gives `spans[1].chaos===true`, and `scored` lacks that span only when the node is set.
- `waves carry the stack in pick order`. `waves[2].stack` equals the three picks, and `waves[2].newPickIndex===2`.
- `an in-progress run with no readings has no spans` (`spans` and `waves` empty).
- `a run with only a final total is one span`. A completed 5-wave run with every reading missed and a final total of 260 gives `[{1,5,260,false}]`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd apps/web && npx vitest run src/analysis/replay.test.ts`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement `readRun` in `src/analysis/replay.ts`**

- [ ] **Step 4: Run the tests and confirm they pass**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/analysis
git commit -m "feat: read recorded runs into Aether spans"
```

### Task B2: Replay spans through the simulator

**Files:**
- Modify: `apps/web/src/analysis/replay.ts` (simulation half)
- Test: `apps/web/src/analysis/replay.test.ts`

**Interfaces:**
- Consumes: `simulateWaveDetailed`, `hash`, `BASELINE`, `Assumptions`, `PlayerProfile` (`recommendation/simulate.ts`)
- Produces:
  - `interface SpanPrediction{mean:number;sd:number;p10:number;p90:number}`
  - `SD_FLOOR=10`
  - `seedOf(id:string):number`, an FNV-1a 32-bit hash
  - `replaySpans(r:RunReadings,samples:number,profile:PlayerProfile=r.profile,assumptions:Assumptions=BASELINE):SpanPrediction[]`, returning one prediction per entry of `r.spans`

The algorithm, which the signature doesn't determine:

```ts
for(let i=0;i<samples;i++){
 const seed=hash(seedOf(r.runId)+i*9733);
 let carry:EventKind[]=[];
 for(const w of r.waves){
  const {out,leftover}=simulateWaveDetailed({index:0,stack:w.stack,genericPicks:0,chaos:w.chaos,newPickIndex:w.newPickIndex},
   profile,hash(seed+Math.imul(w.wave,0x9e3779b1)),assumptions,carry);
  carry=leftover;
  // add the wave's total to the span whose fromWave ≤ w.wave ≤ toWave
 }
}
```

- `p10` is `sorted[Math.floor(0.1*(n-1))]`, and `p90` is `sorted[Math.ceil(0.9*(n-1))]`.
- `sd` is `Math.max(SD_FLOOR,sampleSd)`.

- [ ] **Step 1: Write the failing tests**

- `replays are repeatable for the same run`, where two calls give deep-equal results.
- `a slower kill speed predicts less Aether`, where every span's mean with `killSpeed:'slow'` is below its mean with `'fast'`.
- `a merged span predicts the sum of its waves`. The same run with the wave-2 reading missed gives a merged mean equal to the sum of the two separate means (`toBeCloseTo`, 9 digits).
- `a Chaos Wave span stays inside the Chaos payout range`, with mean between 50 and 330 for an average profile.
- `spread never drops below the floor`, where every `sd` is at least 10.

- [ ] **Step 2: Run them and confirm they fail**

- [ ] **Step 3: Implement `seedOf` and `replaySpans`**

- [ ] **Step 4: Run the tests and confirm they pass**

- [ ] **Step 5: Commit** with the message `feat: replay recorded runs through the simulator`.

### Task B3: Report card

**Files:**
- Create: `apps/web/src/analysis/reportCard.ts`
- Test: `apps/web/src/analysis/reportCard.test.ts`

**Interfaces:**
- Consumes: `RunReadings`, `SpanPrediction` (B1, B2), and `resolveOffer` (`catalog.ts`)
- Produces:
  - `interface Scored{span:Span;pred:SpanPrediction;family:OfferFamily|null}`
  - `interface RangeStats{readings:number;inRange:number;averageMiss:number}`
  - `interface ReportCard{buckets:RangeStats;calibrated:RangeStats|null;byFamily:{family:OfferFamily;stats:RangeStats}[]}`
  - `MIN_FAMILY_READINGS=5`
  - `scoreRun(r:RunReadings,preds:readonly SpanPrediction[]):Scored[]`, which scores `r.scored` and finds each prediction by its span's index in `r.spans`
  - `rangeStats(scored:readonly Scored[]):RangeStats`
  - `reportCard(buckets:readonly Scored[],calibrated:readonly Scored[]|null):ReportCard`

Rules:
- `family` comes from `resolveOffer(r.waves[span.fromWave-1].stack.at(-1))?.family`, or `null`.
- A reading is in range when `p10 ≤ actual ≤ p90`.
- `averageMiss` is the mean of `pred.mean-actual`.
- `byFamily` uses the bucket readings, keeps only non-null families with at least 5 readings, and sorts by reading count, highest first.

- [ ] **Step 1: Write the failing tests**

- `range bounds are inclusive and a positive miss means the model predicted too much`. Actual readings 80, 120 and 100 against `p10:80,p90:120,mean:100` give `inRange:3` and `averageMiss:0`. A single reading with actual 80 and mean 100 gives `averageMiss:20`.
- `families under 5 readings and unknown offers are left out of the breakdown`. Spans whose last pick is "Mystery offer" have family `null` and don't appear.
- `the calibrated row passes through`, where `reportCard(x,null).calibrated===null`.

- [ ] **Steps 2–4:** Fail, implement, pass.
- [ ] **Step 5: Commit** with the message `feat: report card statistics`.

### Task B4: Override tracker

**Files:**
- Create: `apps/web/src/analysis/overrides.ts`
- Test: `apps/web/src/analysis/overrides.test.ts`

**Interfaces:**
- Consumes: `compareScenario` (`recommendation/model.ts`), `playerProfile` (A2), `Scored` (B3)
- Produces:
  - `interface OverrideInput{run:RunRecord;scored:readonly Scored[]|null}`. `scored` is null for runs left out of scoring.
  - `interface OverrideSummary{tookDefault:number;pickedSame:number;tookOther:number;cost:{total:number;average:number;priced:number}|null;forecastGap:{average:number;spans:number}|null;pickedAgainst:{offer:string;count:number}[];skippedRecommendations:{offer:string;count:number}[]}`
  - `overrideSummary(inputs:readonly OverrideInput[],samples:number):OverrideSummary`

Rules:
- Only `offer_chosen` events with a non-null `recommendedOffer` and `choiceSource` count. The three groups follow spec section 5.
- For each override, `compareScenario({history:picksBeforeWave,totalWaves,decisionWave:wave,profile:playerProfile(snapshot)},[recommended,chosen],samples,{sensitivity:false,synergy:false})` prices it when both offers are modeled. The cost is the recommended offer's mean minus the chosen offer's mean.
- `forecastGap` averages `actual-pred.mean` over the scored spans containing an override's wave. Each span counts once.
- Each top list has at most 3 entries, sorted by count, highest first.

- [ ] **Step 1: Write the failing tests**

- `choices split into three groups`. Choices with `default`, `picked` plus the recommended offer, and `picked` plus another offer give 1/1/1. A choice with null `choiceSource` is skipped.
- `an override is priced when both offers are modeled`, with `cost.priced===1` and `cost.average===cost.total`.
- `an unmodeled pick can't be priced`. Choosing "Mystery offer" gives `cost===null`.
- `top lists count and cap at three`.
- `the forecast gap uses each override's span once`. Two overrides inside one merged span give `spans===1`.

- [ ] **Steps 2–4:** Fail, implement, pass.
- [ ] **Step 5: Commit** with the message `feat: override tracker`.

### Task B5: Game-number counts

**Files:**
- Create: `apps/web/src/analysis/counts.ts`
- Test: `apps/web/src/analysis/counts.test.ts`

**Interfaces:**
- Consumes: `readRun` (B1), `resolveOffer`
- Produces:
  - `interface Rate{hits:number;total:number}`
  - `type OfferSetup='reign'|'chaos'|'neither'`
  - `interface GameCounts{offers:Record<OfferSetup,{sets:number;counts:{offer:string;count:number}[]}>;repeats:{withMadness:Rate;withoutMadness:Rate};chaotic:{withTotalChaos:Rate;neither:Rate};varshan:{with:{median:number|null;count:number};without:{median:number|null;count:number}}}`
  - `gameCounts(runs:readonly RunRecord[]):GameCounts`

Rules, from spec section 6:
- A run's setup comes from its snapshot nodes. Reign in Hell gives `reign`, Total Chaos gives `chaos`, and anything else gives `neither`.
- Repeats count offer sets from wave 2 on. They skip sets whose previous pick has no family. A set is a hit when an offer outside `specialSlotIndex` shares the previous pick's family.
- The Chaotic Offering rate excludes `reign` runs.
- Varshan medians use spans where `fromWave===toWave && chaos`.

- [ ] **Step 1: Write the failing tests**

- `offer frequency splits by setup`
- `the Pact slot never counts as a repeat`
- `Reign in Hell runs are excluded from the Chaotic Offering rate`
- `Varshan medians use single-wave Chaos spans only`

- [ ] **Steps 2–4:** Fail, implement, pass.
- [ ] **Step 5: Commit** with the message `feat: offer and Chaos Wave counts from recorded runs`.

### Task B6: Seed fixture, analysis entry point, worker and hook

**Files:**
- Create: `apps/web/tests/seed.mjs`, `apps/web/tests/seed.d.mts`
- Create: `apps/web/src/analysis/analyze.ts`, `apps/web/src/analysis/worker.ts`
- Create: `apps/web/src/ui/useAnalysis.ts`
- Test: `apps/web/src/analysis/analyze.test.ts`

**Interfaces:**
- Consumes: B1–B5
- Produces:
  - `seededState(spec:{profile?:object;runs:{offers:string[][];chosen:number[];totals:(number|null)[];final:number|null}[]}):object`, in `seed.mjs`. It returns a full `LocalState` with valid uuids, sequences, `schemaVersion:1` and `clientVersion`.
  - `SLOW_RUNS`, a spec for a fast/high profile with no War Plan nodes and three completed 10-wave runs. Their offers come from modeled names such as The Teeming Masses, The Bursting Masses and The Hungry Spires. The totals rise by 25 per wave, and every reading is present, which makes 30 readings in all.
  - `REPORT_SAMPLES=150`, `MIN_RUNS=3`, `MIN_READINGS=3`
  - `qualifies(r:RunReadings):boolean`, true when `leftOut===null && scored.length>=MIN_READINGS && status!=='in_progress'`
  - `interface CharacterAnalysis{profileId:string;qualifying:number;needed:number;report:ReportCard|null;leftOut:{pulse:number;events:number};skipped:{falling:number;legacy:number;varshanChaos:number};overrides:OverrideSummary}`
  - `interface Analysis{character:CharacterAnalysis|null;counts:GameCounts}`
  - `analyze(runs:readonly RunRecord[],profileId:string|null,samples=REPORT_SAMPLES):Analysis`
  - `analysisFor(profileId:string|null,a:Analysis|null):Analysis|null`, which returns null when `a.character` belongs to another profile
  - `useAnalysis(runs:RunRecord[],profileId:string|null):{result:Analysis|null;busy:boolean;error:string;retry:()=>void}`

The worker protocol is `{requestId,kind:'analyze',runs,profileId}`, answered with `{requestId,result}` or `{requestId,error}`. The hook follows `useRecommendations`:
- one long-lived worker
- a 300 ms debounce
- replies from superseded requests are ignored
- the key is `JSON.stringify([profileId,runs.map(r=>[r.id,r.events.length,r.status])])`
- the hook returns `analysisFor(profileId,result)`

- [ ] **Step 1: Write the failing tests**

- `the seed fixture is valid stored state`, where `LocalStateSchema.parse(seededState(SLOW_RUNS))` doesn't throw.
- `three qualifying runs produce a report card`, with `report.buckets.readings===30` and `needed===0`.
- `a character without qualifying runs gets an empty state, not an error`. One in-progress run gives `report===null` and `needed===3`.
- `an analysis for another character is discarded`, where `analysisFor('other',a)===null`.

- [ ] **Steps 2–4:** Fail, implement, pass. `seed.d.mts` declares `seededState` and `SLOW_RUNS` for the TypeScript test.
- [ ] **Step 5: Commit** with the message `feat: analysis worker and seed fixture`.

### Task B7: Insights sections

**Files:**
- Create: `apps/web/src/ui/insights/insightsText.ts`
- Create: `ReportCardSection.tsx`, `ChoicesSection.tsx` and `GameNumbersSection.tsx` in `apps/web/src/ui/insights/`, each with a `.module.css`
- Modify: `apps/web/src/ui/insights/Insights.tsx` (props gain `profile:CharacterProfile|null`), `apps/web/src/ui/App.tsx:150`
- Modify: `apps/web/tests/e2e.mjs`, `docs/UX_V2.md`, `docs/ROADMAP_V2.md`
- Test: `apps/web/src/ui/insights/insightsText.test.ts`

**Interfaces:**
- Consumes: `useAnalysis`, `Analysis` (B6)
- Produces:
  - `missText(averageMiss:number):string`
  - `needsText(needed:number):string`
  - `leftOutText(leftOut:{pulse:number;events:number},skipped:{falling:number;legacy:number;varshanChaos:number}):string|null`
  - `percent(hits:number,total:number):string`

Copy:
- `missText` returns "about right on average" when |m| < 5. Otherwise it returns "predicts {m} too much per reading" or "predicts {|m|} too little per reading", with the number rounded.
- `needsText(n)` returns "Record {n} more {run|runs} with Aether readings to see the report card."
- `leftOutText` joins its non-zero parts:
  - "{n} {run was|runs were} left out because Pulse of Aether (offers branch, third row) or the events branch adds Aether the model can't place yet."
  - "{n} {reading was|readings were} skipped because the total went down."
  - "{n} {reading was|readings were} skipped because they came from an older app version."
  - "{n} Chaos Wave {reading was|readings were} skipped because Varshan's Vengeance (Lair Bosses War Plan) can change them."
- Report card headline: "Your gain landed inside the 80% range in {x}% of {n} readings (target 80%)." A table follows, with the columns "Your buckets" and "Calibrated" (the second hidden while `calibrated` is null) and the rows "Inside the range" and "Average miss". Then one line per family, such as "After {family} offers ({n} readings): {missText}".
- Your choices: "Took the pre-selected pick {a} · Picked it yourself {b} · Took another offer {c}". Then "The model estimates your other picks cost about {total} Aether." when priced, and "After those picks you beat its forecast by {g} per reading." (or "fell short of its forecast by") when `forecastGap` exists. Then "Most taken over the recommendation: {offer} ({n}), …".
- Game numbers, one line per count:
  - "The Chaotic Offering, the Chaos Wave offer, appeared in {x}% of {n} offer sets without Total Chaos and {y}% of {m} with it. Total Chaos is in the second row of the offers branch."
  - "Offers shared your previous pick's family in {x}% of sets with Method and Madness, the first node of the offers branch, and {y}% without it."
  - "Chaos Waves paid a median {a} with Varshan's Vengeance ({n} waves) and {b} without it ({m} waves)."
  - A line is hidden when its total is 0.
- While busy with no result, show "Replaying your runs…" as `role="status"`. An error shows a `Notice` with a "Try again" button that calls `retry`.

- [ ] **Step 1: Write the failing `insightsText` tests**, covering each branch above with exact strings.
- [ ] **Step 2: Run them and confirm they fail**
- [ ] **Step 3: Implement the helpers, the three sections and the `Insights`/`App` wiring.** The sections go above Run history, in the order Report card, Your choices, Game numbers.
- [ ] **Step 4: Add the e2e step**
  1. Write `seededState(SLOW_RUNS)` to `localStorage['hordemind-v2-local-v1']` and reload. `e2e.mjs` imports `./seed.mjs`.
  2. Open Insights.
  3. Assert the headings "Report card", "Your choices" and "Game numbers".
  4. Assert the text `/inside the 80% range in \d+% of 30 readings/`.
  5. Assert there's no unreadable-data notice.
- [ ] **Step 5: Verify** with `cd apps/web && npx vitest run && npx tsc --noEmit && bash /Users/rob/.claude/jobs/39387e06/tmp/e2e.sh`. Expected: all pass.
- [ ] **Step 6: Update the docs and commit** with the message `feat: report card, choices and game numbers on Insights`.
- [ ] **Step 7: Owner preview and PR**, as in A3 step 7, on branch `feat/run-insights`.

---

## Phase C: Calibration (PR 3)

Branch `feat/calibration`, created from `main` after PR 2 merges.

### Task C1: Simulator overrides

**Files:**
- Modify: `apps/web/src/recommendation/mechanics.ts:131` (export the Massing Masses health param)
- Modify: `apps/web/src/recommendation/simulate.ts:15-19,61,135,147`
- Test: `apps/web/src/recommendation/simulate.test.ts`

**Interfaces:**
- Produces:
  - `MASSING_HEALTH:Param`, the `assumed(2,…)` object used in The Massing Masses entry
  - `PlayerProfile.clearTime?:number` and `PlayerProfile.travel?:number`
  - `Assumptions.massHealth?:number`
  - `rulesFor(spec:WaveSpec,assumptions:Assumptions=BASELINE):Rules`. Its `timeMult` uses `assumptions.massHealth` when `e.factor===MASSING_HEALTH`.

- [ ] **Step 1: Write the failing tests**

```ts
it('a clearTime override replaces the kill-speed bucket',()=>{
 for(const seed of [1,2,3])expect(simulateWave(spec,{...fast,clearTime:1.5},seed)).toEqual(simulateWave(spec,{...fast,killSpeed:'slow'},seed));
});
it('a travel override replaces the mobility bucket',()=>{
 for(const seed of [1,2,3])expect(simulateWave(spec,{...high,travel:4.5},seed)).toEqual(simulateWave(spec,{...high,mobility:'low'},seed));
});
it('massHealth replaces the Massing Masses guess',()=>{
 const massing={...spec,stack:['The Massing Masses']};
 expect(simulateWave(massing,avg,7,{...BASELINE,massHealth:2})).toEqual(simulateWave(massing,avg,7));
 expect(meanMass(massing,{...BASELINE,massHealth:1})).toBeGreaterThan(meanMass(massing,BASELINE));
});
```

`meanMass` averages `out.Mass` over seeds 1–200.

- [ ] **Steps 2–4:** Fail, implement, pass. Run `npx vitest run src/recommendation` and expect the existing tests to stay green.
- [ ] **Step 5: Commit** with the message `feat: simulator accepts fitted kill speed, travel and Mass health`.

### Task C2: Player fit

**Files:**
- Create: `apps/web/src/analysis/calibrate.ts`
- Test: `apps/web/src/analysis/calibrate.test.ts`

**Interfaces:**
- Consumes: `readRun`, `replaySpans`, `SD_FLOOR` (B1, B2), `qualifies`, `MIN_RUNS` (B6), `BASE` (mechanics)
- Produces:
  - `interface PlayerFit{clearTime:number;travel:number}`
  - `CLEAR_GRID=[0.5,0.76,1.02,1.28,1.54,1.8]`
  - `TRAVEL_GRID=[0.8,1.85,2.9,3.95,5.0]`
  - `STUDENT_NU=4`, `SWITCH_MARGIN=3`, `MAX_RUNS=30`
  - `studentLogDensity(x:number,mean:number,sd:number,nu=STUDENT_NU):number`
  - `bucketPoint(p:Pick<PlayerProfile,'killSpeed'|'mobility'>):PlayerFit`, where `unknown` counts as average
  - `runScore(r:RunReadings,point:PlayerFit|null,samples:number,assumptions?:Assumptions):{score:number;predicted:number}`. A `null` point means the run's own bucket, and `predicted` is the sum of span means.
  - `heldOutBest(scores:readonly (readonly number[])[]):number[]`, where `scores[point][run]` gives, for each run, the index of the best point with that run left out
  - `interface PlayerCalibration{on:boolean;point:PlayerFit;runs:number;gain:number;effect:number;heldOut:Record<string,PlayerFit>}`
  - `fitPlayer(runs:readonly RunReadings[],profile:Pick<CharacterProfile,'id'|'difficulty'>,samples:number):PlayerCalibration|null`

Algorithm, from spec section 3:
1. Select the runs of this profile that qualify. When the difficulty isn't `'Unknown'`, keep only runs at that difficulty. Take the 30 most recent by `createdAt`. Return null when none remain.
2. Score the coarse grid of 6 × 5 points. Then score a 3 × 3 refinement around the best coarse point, with steps ±0.13 for clear time and ±0.525 for travel, clamped to the grid range and deduplicated.
3. `point` is the best total over every scored point. The bucket score is the sum of `runScore(r,null)`.
4. `gain` is the sum over runs of `score[heldOutBest[i]][i]`, minus the bucket score. `on` is `runs>=MIN_RUNS && gain>=SWITCH_MARGIN`.
5. `effect` is the sum of `predicted` at `point` divided by the sum at the buckets, minus 1.

- [ ] **Step 1: Write the failing tests** (4-wave synthetic runs, `samples=40`, to keep them fast)

- `the Student-t score peaks at the mean and has heavier tails than a normal`
- `held-out selection leaves each run out`, where `heldOutBest([[1,1,1],[5,5,-20]])` equals `[0,0,1]`
- `the fit recovers the settings that generated the runs`. Synthetic actuals are set to replay means at clear time 1.3 and travel 3.5, for a fast/high profile. The fit must give `|clearTime-1.3|<=0.26`, `|travel-3.5|<=1.05` and `on===true`.
- `runs generated at the bucket leave calibration off`, where actuals equal to the bucket's replay means give `on===false`.
- `fewer than three qualifying runs never switch on`
- `the difficulty filter applies only when difficulty is set`
- `only the 30 most recent runs count`

- [ ] **Steps 2–4:** Fail, implement, pass.
- [ ] **Step 5: Commit** with the message `feat: fit kill speed and travel time per character`.

### Task C3: Game fit

**Files:**
- Modify: `apps/web/src/analysis/calibrate.ts`
- Test: `apps/web/src/analysis/calibrate.test.ts`

**Interfaces:**
- Produces:
  - `MASS_HEALTH_GRID=[1,1.25,1.5,2,2.5,3]`
  - `FILL_GRID=[0.6,0.8,1,1.2,1.4,1.6]`
  - `interface GameNumber{on:boolean;value:number;guess:number;runs:number;gain:number}`
  - `interface GameCalibration{massHealth:GameNumber|null;fillScale:GameNumber|null}`
  - `fitGame(runs:readonly {readings:RunReadings;player:PlayerFit|null}[],samples:number):GameCalibration`
  - `interface Calibrations{players:Record<string,PlayerCalibration>;game:GameCalibration}`
  - `calibrateAll(runs:readonly RunRecord[],profiles:readonly CharacterProfile[],samples:number):Calibrations`

Rules:
- Each run uses its character's fitted point when that fit is on, and its bucket otherwise.
- Mass health uses runs where any wave's stack includes The Massing Masses, with guess 2. Event spawn rate uses all qualifying runs, with guess 1.
- Held-out selection and switch-on work as in C2, with the guess's score in place of the bucket's.
- `calibrateAll` fits every profile, then fits the game numbers over all characters' qualifying runs.

- [ ] **Step 1: Write the failing tests**

- `Mass health is recovered from runs that had The Massing Masses`, where runs generated at 1.25 give `value<=1.5` and `on===true`
- `Mass health is null without Massing runs`
- `runs at the guessed spawn rate leave it off`

- [ ] **Steps 2–4:** Fail, implement, pass.
- [ ] **Step 5: Commit** with the message `feat: fit Mass health and event spawn rate across characters`.

### Task C4: Benchmark and sample count

**Files:**
- Create: `apps/web/src/analysis/calibrate.bench.ts`
- Modify: `apps/web/src/analysis/calibrate.ts` (adds `FIT_SAMPLES`)

- [ ] **Step 1:** Write a Vitest bench that times `calibrateAll` on 30 synthetic 10-wave runs at 150, 100 and 80 samples.
- [ ] **Step 2:** Run `cd apps/web && npx vitest bench --run src/analysis/calibrate.bench.ts`.
- [ ] **Step 3:** Set `FIT_SAMPLES` to the largest of those that fits 10 s. If none fits, shrink `TRAVEL_GRID` to 4 values (0.8, 2.2, 3.6, 5.0), widen the travel refinement step to ±0.7, and rerun. Record the timings for the PR description.
- [ ] **Step 4: Commit** with the message `perf: size the calibration fit to its time budget`.

### Task C5: Fit cache, worker request and hook

**Files:**
- Create: `apps/web/src/analysis/fitCache.ts`, `apps/web/src/ui/useCalibration.ts`
- Modify: `apps/web/src/analysis/worker.ts` (`kind:'calibrate'`), `apps/web/src/ui/App.tsx`
- Test: `apps/web/src/analysis/fitCache.test.ts`

**Interfaces:**
- Produces:
  - `CALIBRATION_KEY='hordemind-calibration-v1'`
  - `fitKey(runs:readonly RunRecord[],profiles:readonly CharacterProfile[]):string`, built from `RECOMMENDER_VERSION`, each profile's `[id,difficulty]` and each run's `[id,events.length,status]`
  - `loadFits(key:string,storage?:Storage):Calibrations|null`
  - `saveFits(key:string,value:Calibrations,storage?:Storage):void`
  - `useCalibration(runs:RunRecord[],profiles:CharacterProfile[]):{calibrations:Calibrations|null;busy:boolean;error:string;retry:()=>void}`

Behavior:
- The cache stores a single `{key,value}` entry.
- `loadFits` returns null on a key mismatch, a parse failure or a storage exception. `saveFits` swallows storage exceptions.
- The hook loads from the cache first, posts `calibrate` on a miss, and saves the reply.

- [ ] **Step 1: Write the failing tests**

- `a saved fit loads back under the same key`, using a Map-backed `Storage` stub
- `a different key misses`
- `storage that throws returns null and never throws`
- `the key changes when a run gains an event, a difficulty changes, or the model version changes`

- [ ] **Steps 2–4:** Fail, implement, pass. Wire `useCalibration` into `App` next to `useSync`.
- [ ] **Step 5: Commit** with the message `feat: cache calibration in the browser and compute it in the worker`.

### Task C6: Calibrated estimates and the off switch

**Files:**
- Modify: `apps/web/src/domain/schema.ts`, `apps/web/src/domain/run.ts` (`useCalibration`)
- Modify: `apps/web/src/analysis/calibrate.ts` (`calibrationFor`)
- Modify: `apps/web/src/recommendation/model.ts` (`Calibration`), `apps/web/src/recommendation/scenario.ts`
- Modify: `apps/web/src/ui/character/CharacterForm.tsx`, `apps/web/src/ui/live/LiveRun.tsx`, `apps/web/src/ui/App.tsx:149`
- Test: `apps/web/src/recommendation/model.test.ts`, `apps/web/src/analysis/calibrate.test.ts`

**Interfaces:**
- Produces:
  - `useCalibration:z.boolean().default(true)` on the profile
  - `interface Calibration{clearTime?:number;travel?:number;massHealth?:number;fillScale?:number}`, exported from `recommendation/model.ts` so the model doesn't import from `analysis/`
  - `calibrationFor(c:Calibrations|null,profile:CharacterProfile|null):Calibration|null`, which includes only switched-on numbers and returns null when `useCalibration` is false or nothing is on
  - `Scenario.calibration?:Calibration|null`
  - `scenarioFromRun(run:RunRecord,calibration:Calibration|null=null):Scenario`
  - a `calibration:Calibration|null` prop on `LiveRun`

`compareScenario` changes:
- The profile gains `clearTime` and `travel` from the calibration.
- The base assumptions are `{completionScale:1,fillScale:cal.fillScale??1,massHealth:cal.massHealth}`. Every `marginal` call, including those in `synergiesFor` and `withoutDoom`, uses them.
- Each sensitivity set multiplies its `fillScale` into the base.
- `modelVersion` gains `+calibrated` when the calibration has any value.
- The first `GLOBAL_ASSUMPTIONS` line becomes "From your runs: kill speed ×{c}, travel {t} s between events, Mass health {m}×, event spawn rate ×{f}." Only present values appear, rounded to 2 decimals.
- `provenanceNotes(offer,cal)` replaces The Massing Masses' assumed note with "From your runs: Mass health {m}×." when `massHealth` is set.

The switch in `CharacterForm` is a kit `Checkbox` labelled "Use calibration". Its help text reads "When your recorded runs show this character's kill speed or travel time differ from your settings, HordeMind fits them to your Aether readings. Turn this off to use your settings as entered."

- [ ] **Step 1: Write the failing tests**

- `calibration marks the model version`, ending in `+calibrated` with a calibration and equal to `RECOMMENDER_VERSION` without one
- `a calibrated clear time matches the equivalent bucket`. A fast profile with `{clearTime:1.5}` gives the same `recommended` and means as a slow profile without calibration.
- `the calibration note names the fitted numbers`, where `warnings` contains `From your runs: kill speed ×1.5`
- `calibrationFor honours the switch and includes only switched-on numbers`

- [ ] **Steps 2–4:** Fail, implement, pass. In `App`, pass `calibrationFor(calibrations,profileOfActiveRun)` to `LiveRun`. `profileOfActiveRun` is the profile whose id equals `runProfileId(activeRun)`.
- [ ] **Step 5: Commit** with the message `feat: calibrated estimates with a per-character off switch`.

### Task C7: Live Run marker, Model fit section, calibrated report-card row

**Files:**
- Create: `apps/web/src/ui/live/CalibratedMarker.tsx` and its `.module.css`
- Create: `apps/web/src/ui/insights/ModelFitSection.tsx` and its `.module.css`
- Modify: `apps/web/src/analysis/analyze.ts` (`analyze(…,calibration:PlayerCalibration|null=null)`), `apps/web/src/analysis/overrides.ts`, `apps/web/src/analysis/worker.ts`, `apps/web/src/ui/useAnalysis.ts`, `GameNumbersSection.tsx`, `Insights.tsx`, `LiveRun.tsx`, `App.tsx`
- Modify: `apps/web/tests/e2e.mjs`, `docs/UX_V2.md`, `docs/ROADMAP_V2.md`, `README.md`
- Test: `apps/web/src/ui/insights/insightsText.test.ts`, `apps/web/src/analysis/analyze.test.ts`

**Interfaces:**
- Consumes: `Calibrations`, `calibrationFor`, `bucketPoint` (C2–C6)
- Produces:
  - `effectText(effect:number):string`
  - `fitStatusText(c:PlayerCalibration|null,useCalibration:boolean,needed:number):string`

Copy:
- `effectText` returns "Your waves yield {x}% more than your buckets predict." or "… {x}% less …", or "Your waves match your buckets within 2%." when |x| < 2.
- `fitStatusText` covers four states:
  - on: "Calibration is on." followed by `effectText`
  - switched off: "Calibration is off for this character. Turn it on under Character."
  - not enough runs: `needsText(needed)` with "the report card" replaced by "calibration"
  - fitted but not clear: "Your runs don't yet show a clear difference from your buckets, so estimates use your buckets."
- The Model fit details read "Kill speed ×{c} (your {bucket} setting: ×{b}). Travel {t} s between events (your {bucket} setting: {b} s). Fitted from {n} runs."
- Game numbers add "Mass health, The Massing Masses' tougher Masses, fitted at {v}× (guess 2×). {In use.|Not clear yet.}" and "Event spawn rate fitted at ×{v} (guess ×1). {In use.|Needs event counts or a second character to measure.}"
- The marker is a `DisclosureToggle` labelled "Calibrated", placed above `PickCard`. It opens the same details text.

The calibrated report-card row replays each qualifying run at `calibration.heldOut[run.id]`, and only when `calibration.on`.

Wiring changes:
- `overrideSummary(inputs,samples,calibration:Calibration|null=null)` passes the calibration into each priced scenario, so the predicted cost uses calibration when it's on.
- `useAnalysis(runs,profileId,calibration:PlayerCalibration|null)` puts the calibration into its request and its key.
- `Insights` gains a `calibrations:Calibrations|null` prop from `App`.

- [ ] **Step 1: Write the failing tests**

- each `effectText` and `fitStatusText` branch, with exact strings
- `the calibrated row uses held-out points`, where `analyze(…,calibration)` on `SLOW_RUNS` gives `report.calibrated.readings===30`

- [ ] **Steps 2–4:** Fail, implement, pass.
- [ ] **Step 5: Add the e2e step**
  1. Seed `SLOW_RUNS`.
  2. Open Insights and wait up to 30 s for "Calibration is on".
  3. Start a run, enter two offers, and assert the "Calibrated" button is visible.
  4. On Character, uncheck "Use calibration".
  5. Back in Live Run, assert the marker is gone.
- [ ] **Step 6: Verify** with `cd apps/web && npx vitest run && npx tsc --noEmit && bash /Users/rob/.claude/jobs/39387e06/tmp/e2e.sh`. Expected: all pass.
- [ ] **Step 7: Update the docs and commit** with the message `feat: calibration marker, Model fit section and calibrated report card`.
- [ ] **Step 8: Owner preview and PR**, as in A3 step 7, on branch `feat/calibration`. The PR description includes the C4 timings.
