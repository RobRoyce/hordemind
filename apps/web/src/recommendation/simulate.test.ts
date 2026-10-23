import {describe,it,expect} from 'vitest';
import {simulateRun,simulateWave,rulesFor,hash} from './simulate';

const average={killSpeed:'average',mobility:'average',warPlanNodes:[]} as const;
const total=(b:Record<string,number>)=>Object.values(b).reduce((a,v)=>a+v,0);
const mean=(f:(seed:number)=>number,n=300)=>{let s=0;for(let i=0;i<n;i++)s+=f(hash(i*7919+1));return s/n};
const plain={index:0,stack:[],newPicks:[],genericPicks:0,chaos:false};

describe('wave simulator',()=>{
 it('is deterministic for a seed',()=>{
  const spec={...plain,stack:['The Puffing Masses','The Hellish Masses'],genericPicks:2};
  expect(simulateWave(spec,average,42)).toEqual(simulateWave(spec,average,42));
 });
 it('pays Wrath of Hell instead of Burning Rain when both are taken',()=>{
  expect(rulesFor({...plain,stack:['The Burning Rain','The Wrath of Hell']}).waveEnd).toEqual([{min:15,max:24}]);
 });
 it('fires a one-time Butcher only in the first wave after the pick',()=>{
  const gain=(waves:number)=>mean(seed=>total(simulateRun([],'The Stalking Devil',waves,average,seed))-total(simulateRun([],null,waves,average,seed)));
  const once=gain(1),many=gain(6);
  expect(once).toBeGreaterThan(50);
  expect(Math.abs(many-once)).toBeLessThan(15);
  expect(rulesFor({...plain,index:2,stack:['The Stalking Devil'],newPicks:['The Stalking Devil']}).start.get('Butcher')).toBeUndefined();
 });
 it('replaces the whole wave with a Chaos outcome',()=>{
  const w=simulateWave({...plain,stack:['Chaotic Offering'],newPicks:['Chaotic Offering'],chaos:true},average,7);
  expect(w.Chaos).toBeGreaterThan(0);
  expect(total(w)-w.Chaos).toBe(0);
 });
 it('lets slower events displace other events within the time budget',()=>{
  const quick=mean(seed=>total(simulateWave(plain,average,seed)));
  const slow=mean(seed=>total(simulateWave(plain,average,seed,{completionScale:2,fillScale:1})));
  expect(slow).toBeLessThan(quick*0.85);
 });
});
