import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision,append,project,undoChoice,effectiveEvents} from './run';
describe('run journal invariants',()=>{
 it('records every offered candidate, chosen option, and optional Aether',()=>{
  const profile=newProfile('Paladin','Paladin');
  let run=newRun(profile,10);
  run=recordDecision(run,['The Puffing Masses','The Anchored Masses','Chaotic Offering'],'The Puffing Masses',false);
  run=append(run,'wave_observed',{wave:1,totalAether:120});
  expect(project(run).nextWave).toBe(2);
  expect(effectiveEvents(run).find(e=>e.type==='offers_presented')?.type).toBe('offers_presented');
  expect(project(run).lastTotalAether).toBe(120);
 });
 it('rejects phantom offerings, double decisions and reused special options',()=>{
  let p=newProfile('Paladin','Paladin');p.specialOfferingAvailable=true;
  let r=newRun(p,6);
  expect(()=>recordDecision(r,['A','B'],'C',false)).toThrow();
  r=recordDecision(r,['A','B'],'A',true);
  expect(()=>recordDecision(r,['A','B'],'B',false)).toThrow();
  r=append(r,'wave_observed',{wave:1,totalAether:null});
  expect(()=>recordDecision(r,['C','D'],'C',true)).toThrow();
 });
 it('undo uses append-only correction without deleting the original evidence',()=>{
  const p=newProfile('Tester','Rogue');
  let r=recordDecision(newRun(p,8),['A','B'],'A',false);
  const before=r.events.length;
  r=undoChoice(r);
  expect(r.events.length).toBe(before+1);
  expect(project(r).chosen).toHaveLength(0);
  expect(project(r).nextWave).toBe(1);
 });
 it('distinguishes unknown event counts from zero',()=>{
  const p=newProfile('Tester','Druid');let r=recordDecision(newRun(p,8),['A','B'],'A',false);
  r=append(r,'wave_observed',{wave:1,totalAether:null});
  const observation=effectiveEvents(r).find(e=>e.type==='wave_observed');
  expect(observation?.type==='wave_observed'&&observation.payload.eventCounts).toBeUndefined();
 });
});
