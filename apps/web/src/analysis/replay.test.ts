import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision,endRun,undoChoice} from '../domain/run';
import type {CharacterProfile,RunRecord} from '../domain/schema';
import {readRun,replaySpans,seedOf,SD_FLOOR,type RunReadings} from './replay';

const A='The Gorging Mass',B='The Rising Spires',C='The Exalted Hordes',D='The Aether Rush',CH='The Chaotic Offering';
const prof=(over:Partial<CharacterProfile>={}):CharacterProfile=>({...newProfile('T','Paladin'),...over});
/** Records one decision per pick; reads[i] is the total entered before pick i+1 (reads[0] is ignored). */
function play(profile:CharacterProfile,picks:string[],reads:(number|null)[]=[]):RunRecord{
 let run=newRun(profile,picks.length);
 picks.forEach((p,i)=>{run=recordDecision(run,{offered:[p,'x'],chosenIndex:0,observation:i>0&&reads[i]!=null?{totalAether:reads[i]!}:null})});
 return run;
}
const setTotal=(run:RunRecord,afterWave:number,totalAether:number):RunRecord=>({...run,events:run.events.map(e=>e.type==='aether_observed'&&e.payload.afterWave===afterWave?{...e,payload:{...e.payload,totalAether}}:e)});

describe('readRun',()=>{
 it('spans run between consecutive readings, starting from zero',()=>{
  const run=endRun(play(prof(),[A,B,C,D],[0,40,90,null]),'completed',200);
  expect(readRun(run).spans).toEqual([{fromWave:1,toWave:1,actual:40,chaos:false},{fromWave:2,toWave:2,actual:50,chaos:false},{fromWave:3,toWave:4,actual:110,chaos:false}]);
 });
 it('a falling total is skipped and its span merges onward',()=>{
  const run=setTotal(play(prof(),[A,B,C,D],[0,40,50,120]),2,30);
  const r=readRun(run);
  expect(r.spans).toEqual([{fromWave:1,toWave:1,actual:40,chaos:false},{fromWave:2,toWave:3,actual:80,chaos:false}]);
  expect(r.skipped.falling).toBe(1);
 });
 it('undone readings are ignored',()=>{
  const run=undoChoice(play(prof(),[A,B,C],[0,40,90]));
  expect(readRun(run).spans).toEqual([{fromWave:1,toWave:1,actual:40,chaos:false}]);
 });
 it('legacy readings are counted, not used',()=>{
  const base=play(prof(),[A,B],[0,40]);
  const run={...base,events:[...base.events,{...base.events.at(-1)!,id:crypto.randomUUID(),sequence:base.events.length,type:'wave_observed' as const,payload:{wave:2,totalAether:70,eventCounts:{}}}]} as RunRecord;
  const r=readRun(run);
  expect(r.skipped.legacy).toBe(1);
  expect(r.spans).toHaveLength(1);
 });
 it('runs with Pulse of Aether or an events-branch node are left out',()=>{
  expect(readRun(newRun(prof({warPlanNodes:['Pulse of Aether']}),3)).leftOut).toBe('pulse');
  expect(readRun(newRun(prof({warPlanNodes:['Pulse of Aether','Cult of Annihilation']}),3)).leftOut).toBe('events');
  expect(readRun(newRun(prof(),3)).leftOut).toBeNull();
 });
 it("with Varshan's Vengeance, Chaos Wave spans are not scored",()=>{
  const reads=[0,40,90];
  const plain=readRun(play(prof(),[A,CH,C],reads)),varshan=readRun(play(prof({lairBossNodes:["Varshan's Vengeance"]}),[A,CH,C],reads));
  expect(plain.spans[1]!.chaos).toBe(true);
  expect(plain.scored).toHaveLength(2);
  expect(varshan.scored).toHaveLength(1);
  expect(varshan.skipped.varshanChaos).toBe(1);
 });
 it('waves carry the stack in pick order',()=>{
  const r=readRun(play(prof(),[A,B,C],[0,40,90]));
  expect(r.waves).toHaveLength(2);
  const r3=readRun(endRun(play(prof(),[A,B,C],[0,40,90]),'completed',150));
  expect(r3.waves[2]!.stack).toEqual([A,B,C]);
  expect(r3.waves[2]!.newPickIndex).toBe(2);
 });
 it('an in-progress run with no readings has no spans',()=>{
  const r=readRun(play(prof(),[A,B]));
  expect(r.spans).toEqual([]);
  expect(r.waves).toEqual([]);
 });
 it('a run with only a final total is one span',()=>{
  const r=readRun(endRun(play(prof(),[A,B,C,D,A]),'completed',260));
  expect(r.spans).toEqual([{fromWave:1,toWave:5,actual:260,chaos:false}]);
 });
});

describe('replaySpans',()=>{
 const EC='The Exalted Council',MYSTERY='Mystery offer';
 const base=play(prof({killSpeed:'average'}),[A,EC,C,D],[0,40,90,150]);
 const council=(pick:string,finish:boolean)=>{
  // the twin swaps the pick's name inside the same run, so both replay on the same seed
  const run=JSON.parse(JSON.stringify(base).replaceAll(EC,pick)) as RunRecord;
  return readRun(finish?endRun(run,'completed',200):endRun(run,'abandoned',null));
 };
 it('Council Aether lands in the final reading',()=>{
  const real=replaySpans(council(EC,true),60),twin=replaySpans(council(MYSTERY,true),60);
  expect(real).toHaveLength(4);
  for(let i=0;i<3;i++)expect(real[i]!.mean).toBeCloseTo(twin[i]!.mean,9);
  expect(real[3]!.mean-twin[3]!.mean).toBeCloseTo(25,9);
 });
 it('an abandoned run drops Council Aether',()=>{
  const real=replaySpans(council(EC,false),60),twin=replaySpans(council(MYSTERY,false),60);
  expect(real).toHaveLength(3);
  real.forEach((p,i)=>expect(p.mean).toBeCloseTo(twin[i]!.mean,9));
 });
 const done=()=>readRun(endRun(play(prof({killSpeed:'average'}),[A,B,C,D],[0,40,90,null]),'completed',200));
 it('replays are repeatable for the same run',()=>{
  const r=done();
  expect(replaySpans(r,60)).toEqual(replaySpans(r,60));
 });
 it('seedOf is a stable 32-bit hash',()=>{
  expect(seedOf('a')).toBe(0xe40c292c);
  expect(seedOf('')).toBe(0x811c9dc5);
 });
 it('a slower kill speed predicts less Aether',()=>{
  const r=done(),slow=replaySpans(r,80,{...r.profile,killSpeed:'slow'}),fast=replaySpans(r,80,{...r.profile,killSpeed:'fast'});
  slow.forEach((s,i)=>expect(s.mean).toBeLessThan(fast[i]!.mean));
 });
 it('a merged span predicts the sum of its waves',()=>{
  const r=readRun(endRun(play(prof(),[A,B,C],[0,40,90]),'completed',200));
  const split:RunReadings={...r,spans:[{fromWave:1,toWave:1,actual:0,chaos:false},{fromWave:2,toWave:2,actual:0,chaos:false},{fromWave:3,toWave:3,actual:0,chaos:false}]};
  const merged:RunReadings={...r,spans:[{fromWave:1,toWave:1,actual:0,chaos:false},{fromWave:2,toWave:3,actual:0,chaos:false}]};
  const a=replaySpans(split,50),b=replaySpans(merged,50);
  expect(b[1]!.mean).toBeCloseTo(a[1]!.mean+a[2]!.mean,9);
 });
 it('a Chaos Wave span stays inside the Chaos payout range',()=>{
  const r=readRun(endRun(play(prof({killSpeed:'average',mobility:'average'}),[CH]),'completed',150));
  expect(r.waves[0]!.chaos).toBe(true);
  const [p]=replaySpans(r,200);
  expect(p!.mean).toBeGreaterThan(50);
  expect(p!.mean).toBeLessThan(330);
 });
 it('spread never drops below the floor',()=>{
  replaySpans(done(),40).forEach(p=>expect(p.sd).toBeGreaterThanOrEqual(SD_FLOOR));
  expect(replaySpans(done(),1).every(p=>p.sd===SD_FLOOR)).toBe(true);
 });
});
