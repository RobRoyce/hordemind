import {describe,it,expect} from 'vitest';
import {simulateRun,simulateWave,simulateWaveDetailed,rulesFor,hash,type PlayerProfile} from './simulate';

const average={killSpeed:'average',mobility:'average',warPlanNodes:[]} as const;
const total=(b:Record<string,number>)=>Object.values(b).reduce((a,v)=>a+v,0);
const mean=(f:(seed:number)=>number,n=300)=>{let s=0;for(let i=0;i<n;i++)s+=f(hash(i*7919+1));return s/n};
const plain={index:0,stack:[] as string[],newPickIndex:null as number|null,genericPicks:0,chaos:false};

describe('wave simulator',()=>{
 it('is deterministic for a seed',()=>{
  const spec={...plain,stack:['The Puffing Masses','The Hellish Masses'],genericPicks:2};
  expect(simulateWave(spec,average,42)).toEqual(simulateWave(spec,average,42));
 });
 it('pays Wrath of Hell instead of Burning Rain when both are taken, without doubling Hellfire',()=>{
  const rules=rulesFor({...plain,stack:['The Burning Rain','The Wrath of Hell']});
  expect(rules.waveEnd).toEqual([{min:15,max:24}]);
  expect(rules.hellfireSources).toBe(1);
 });
 it('converts every Fiend into a Lord under Colossal Fiends, including Teeming spawns',()=>{
  const fiends=mean(seed=>simulateWave({...plain,stack:['The Teeming Masses','The Bursting Masses','The Colossal Fiends']},average,seed).Fiend);
  expect(fiends).toBe(0);
 });
 it('fires a one-time Butcher only in the first wave after the pick',()=>{
  const gain=(waves:number)=>mean(seed=>total(simulateRun([],'The Stalking Devil',waves,average,seed))-total(simulateRun([],null,waves,average,seed)));
  const once=gain(1),many=gain(6);
  expect(once).toBeGreaterThan(50);
  expect(Math.abs(many-once)).toBeLessThan(15);
  expect(rulesFor({...plain,index:2,stack:['The Stalking Devil'],newPickIndex:0}).start.get('Butcher')).toBeUndefined();
 });
 it('fires only the new copy of a first-wave effect already in the stack',()=>{
  const rules=rulesFor({...plain,stack:['The Stalking Devil','The Stalking Devil'],newPickIndex:1});
  expect(rules.start.get('Butcher')).toBe(1);
 });
 it('replaces the whole wave with a Chaos outcome',()=>{
  const w=simulateWave({...plain,stack:['Chaotic Offering'],newPickIndex:0,chaos:true},average,7);
  expect(w.Chaos).toBeGreaterThan(0);
  expect(total(w)-w.Chaos).toBe(0);
 });
 it('lets slower events displace other events within the time budget',()=>{
  const quick=mean(seed=>total(simulateWave(plain,average,seed)));
  const slow=mean(seed=>total(simulateWave(plain,average,seed,{completionScale:2,fillScale:1})));
  expect(slow).toBeLessThan(quick*0.85);
 });
});

describe('War Plan: Impending Doom (tooltip, S15)',()=>{
 const doom:PlayerProfile={...average,warPlanNodes:['Method and Madness','Impending Doom']};
 const wave=(profile:PlayerProfile,stack:string[]=[])=>mean(seed=>total(simulateWave({...plain,stack},profile,seed)),400);
 it('adds Aether from the events it spawns near the end of the wave',()=>{
  // About one of the four late events fits in the last 10 s, and it displaces a normal one.
  expect(wave(doom)).toBeGreaterThan(wave(average)+1);
 });
 it('triggers again with 30 s left at Splinter of Terror rank 14',()=>{
  expect(wave({...doom,splinterRank:14})).toBeGreaterThan(wave({...doom,splinterRank:13})+1);
 });
 it('makes offers that pay per event worth more',()=>{
  const puffingGain=(p:PlayerProfile)=>wave(p,['The Puffing Masses'])-wave(p);
  expect(puffingGain(doom)).toBeGreaterThan(puffingGain(average));
 });
});

describe('The Enduring Lords',()=>{
 it('carries unfinished Lords into the next wave',()=>{
  const slow={killSpeed:'slow',mobility:'low',warPlanNodes:[]} as const;
  const spec={...plain,stack:['The Summoned Lords','The Enduring Lords']};
  let carried=0;
  for(let i=0;i<200;i++)carried+=simulateWaveDetailed(spec,slow,hash(i)).leftover.length;
  expect(carried).toBeGreaterThan(0);
  const none={...plain,stack:['The Summoned Lords']};
  let without=0;
  for(let i=0;i<200;i++)without+=simulateWaveDetailed(none,slow,hash(i)).leftover.length;
  expect(without).toBe(0);
 });
});
