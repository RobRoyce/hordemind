import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision} from '../domain/run';
import type {CharacterProfile,RunRecord} from '../domain/schema';
import {gameCounts} from './counts';

const A='The Gorging Mass',A2='The Teeming Masses',B='The Rising Spires',CH='The Chaotic Offering';
const prof=(nodes:string[]=[],lair:string[]=[]):CharacterProfile=>({...newProfile('T','Paladin'),warPlanNodes:nodes,lairBossNodes:lair});
type Set={offered:string[];chosen?:number;special?:number;total?:number};
/** Plays one decision per set; total is the Aether reading entered before that pick. */
function play(profile:CharacterProfile,sets:Set[]):RunRecord{
 let run=newRun(profile,sets.length);
 sets.forEach((s,i)=>{run=recordDecision(run,{offered:s.offered,chosenIndex:s.chosen??0,...(s.special!==undefined?{specialSlotIndex:s.special}:{}),observation:i>0&&s.total!==undefined?{totalAether:s.total}:null})});
 return run;
}
const find=(c:{offer:string;count:number}[],o:string)=>c.find(x=>x.offer===o)?.count;

describe('gameCounts',()=>{
 it('offer frequency splits by setup',()=>{
  const g=gameCounts([play(prof(['Reign in Hell']),[{offered:[A,B]},{offered:[A,B]}]),play(prof(['Total Chaos']),[{offered:[A,B]}]),play(prof(),[{offered:['the gorging mass',B]}])]);
  expect(g.offers.reign.sets).toBe(2);
  expect(find(g.offers.reign.counts,A)).toBe(2);
  expect(g.offers.chaos.sets).toBe(1);
  expect(g.offers.neither.sets).toBe(1);
  expect(find(g.offers.neither.counts,A)).toBe(1);
 });
 it('the Pact slot never counts as a repeat',()=>{
  const sets:Set[]=[{offered:[A,B]},{offered:[B,A2],special:1},{offered:[B,A2]}];
  const g=gameCounts([play(prof(['The Black Pact','Method and Madness']),sets),play(prof(['The Black Pact']),sets)]);
  // wave 2 misses because only the Pact slot shares the previous pick's family; wave 3 hits because B repeats B
  expect(g.repeats.withMadness).toEqual({hits:1,total:2});
  expect(g.repeats.withoutMadness).toEqual({hits:1,total:2});
 });
 it('repeats split by Method and Madness',()=>{
  // previous pick is a Masses offer; the wave-2 set repeats Masses only in the Madness run
  const g=gameCounts([play(prof(['Method and Madness']),[{offered:[A,B]},{offered:[A2,B]}]),play(prof(),[{offered:[A,B]},{offered:[B,CH]}])]);
  expect(g.repeats.withMadness).toEqual({hits:1,total:1});
  expect(g.repeats.withoutMadness).toEqual({hits:0,total:1});
 });
 it('Reign in Hell runs are excluded from the Chaotic Offering rate',()=>{
  const withChaotic:Set[]=[{offered:[A,CH]},{offered:[A,B]}];
  const g=gameCounts([play(prof(['Reign in Hell']),withChaotic),play(prof(['Total Chaos']),withChaotic),play(prof(),[{offered:[A,B]},{offered:[A,B]}])]);
  expect(g.chaotic.withTotalChaos).toEqual({hits:1,total:2});
  expect(g.chaotic.neither).toEqual({hits:0,total:2});
 });
 it('Varshan medians use single-wave Chaos spans only',()=>{
  const run=(lair:string[],totals:number[])=>play(prof([],lair),[{offered:[A,B]},{offered:[CH,B],total:totals[0]!},{offered:[A,B],total:totals[1]!},{offered:[CH,B],total:totals[2]!},{offered:[A,B],total:totals[3]!}]);
  // chaos picks at waves 2 and 4; readings after waves 1..4
  const g=gameCounts([run([],[10,50,60,100]),run(["Varshan's Vengeance"],[10,30,40,50])]);
  expect(g.varshan.without).toEqual({median:40,count:2});
  expect(g.varshan.with).toEqual({median:15,count:2});
  expect(gameCounts([]).varshan.with).toEqual({median:null,count:0});
 });
});
