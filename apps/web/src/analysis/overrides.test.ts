import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision} from '../domain/run';
import {compareScenario} from '../recommendation/model';
import {playerProfile} from '../recommendation/scenario';
import type {RunRecord} from '../domain/schema';
import {overrideSummary,type OverrideInput} from './overrides';
import type {Scored} from './reportCard';

const A='The Gorging Mass',B='The Rising Spires',C='The Exalted Hordes',D='The Aether Rush',MYSTERY='Mystery offer';
type Pick={chosen:string;rec?:string|null;src?:'default'|'picked'};
/** One decision per entry; the chosen offer is offered alongside the recommendation. */
function play(picks:Pick[],total=picks.length):RunRecord{
 let run=newRun(newProfile('T','Paladin'),total);
 for(const p of picks)run=recordDecision(run,{offered:[p.chosen,p.rec??'x'],chosenIndex:0,recommendedOffer:p.rec??null,choiceSource:p.src});
 return run;
}
const input=(run:RunRecord,scored:Scored[]|null=null):OverrideInput=>({run,scored});
const SAMPLES=40;
const scoredSpan=(fromWave:number,toWave:number,actual=100,mean=80):Scored=>({span:{fromWave,toWave,actual,chaos:false},pred:{mean,sd:10,p10:60,p90:100},family:null});

describe('overrideSummary',()=>{
 it('choices split into three groups',()=>{
  const run=play([{chosen:A,rec:A,src:'default'},{chosen:B,rec:B,src:'picked'},{chosen:C,rec:D,src:'picked'},{chosen:A,rec:A}]);
  const s=overrideSummary([input(run)],SAMPLES);
  expect([s.tookDefault,s.pickedSame,s.tookOther]).toEqual([1,1,1]);
 });
 it('choices without a recommendation are skipped',()=>{
  const s=overrideSummary([input(play([{chosen:A,src:'picked'}]))],SAMPLES);
  expect([s.tookDefault,s.pickedSame,s.tookOther]).toEqual([0,0,0]);
  expect(s.cost).toBeNull();
 });
 it('an override is priced when both offers are modeled',()=>{
  const s=overrideSummary([input(play([{chosen:A,rec:B,src:'picked'}]))],SAMPLES);
  expect(s.cost?.priced).toBe(1);
  expect(s.cost?.average).toBe(s.cost?.total);
  expect(Number.isFinite(s.cost!.total)).toBe(true);
 });
 it('the cost is the recommendation\'s mean minus the chosen offer\'s, from the picks before the override',()=>{
  const s=overrideSummary([input(play([{chosen:A},{chosen:C,rec:B,src:'picked'}],5))],SAMPLES);
  const cmp=compareScenario({history:[A],totalWaves:5,decisionWave:2,profile:playerProfile(newProfile('T','Paladin'))},[B,C],SAMPLES,{sensitivity:false,synergy:false});
  const mean=(o:string)=>{const a=cmp.assessments.find(x=>x.offer===o);return a?.modeled?a.mean:NaN};
  expect(mean(B)-mean(C)).not.toBe(0);
  expect(s.cost?.total).toBeCloseTo(mean(B)-mean(C),9);
 });
 it("an unmodeled pick can't be priced",()=>{
  const s=overrideSummary([input(play([{chosen:MYSTERY,rec:A,src:'picked'}]))],SAMPLES);
  expect(s.tookOther).toBe(1);
  expect(s.cost).toBeNull();
 });
 it('top lists count and cap at three',()=>{
  const picks:Pick[]=[
   {chosen:A,rec:D,src:'picked'},{chosen:A,rec:D,src:'picked'},{chosen:A,rec:C,src:'picked'},
   {chosen:B,rec:D,src:'picked'},{chosen:B,rec:C,src:'picked'},{chosen:C,rec:A,src:'picked'},{chosen:MYSTERY,rec:A,src:'picked'}];
  const s=overrideSummary([input(play(picks))],SAMPLES);
  expect(s.pickedAgainst).toHaveLength(3);
  expect(s.pickedAgainst.slice(0,2)).toEqual([{offer:A,count:3},{offer:B,count:2}]);
  expect(s.skippedRecommendations).toHaveLength(3);
  expect(s.skippedRecommendations.slice(0,2)).toEqual([{offer:D,count:3},{offer:C,count:2}]);
 });
 it('the forecast gap counts each later span once',()=>{
  const run=play([{chosen:A},{chosen:A},{chosen:B,rec:A,src:'picked'},{chosen:A},{chosen:C,rec:A,src:'picked'},{chosen:A}]);
  const scored=[1,2,3,4,5,6].map(w=>scoredSpan(w,w));
  const s=overrideSummary([input(run,scored)],SAMPLES);
  expect(s.forecastGap).toEqual({average:20,spans:4});
 });
 it('a span that began before the override is not counted',()=>{
  const run=play([{chosen:A},{chosen:A},{chosen:B,rec:A,src:'picked'},{chosen:A},{chosen:A},{chosen:A}]);
  const scored=[scoredSpan(1,1),scoredSpan(2,3),scoredSpan(4,4),scoredSpan(5,5),scoredSpan(6,6)];
  expect(overrideSummary([input(run,scored)],SAMPLES).forecastGap?.spans).toBe(3);
 });
 it('runs left out of scoring add no forecast gap',()=>{
  const run=play([{chosen:B,rec:A,src:'picked'}]);
  expect(overrideSummary([input(run,null)],SAMPLES).forecastGap).toBeNull();
 });
});
