import {describe,it,expect} from 'vitest';
import {mergeStates,reconcile,sameState} from './merge';
import {newProfile,newRun,recordDecision} from './run';
import {EMPTY_STATE,type LocalState} from './schema';

const state=(patch:Partial<LocalState>):LocalState=>({...structuredClone(EMPTY_STATE),...patch});

describe('merging state written by another tab',()=>{
 it('keeps runs recorded in the other tab when this tab edits a profile',()=>{
  const profile=newProfile('Paladin','Paladin');
  const run=newRun(profile,10);
  const stale=state({profiles:[{...profile,difficulty:'Torment XII',updatedAt:new Date(Date.parse(profile.updatedAt)+1000).toISOString()}],runs:[run]});
  const other=state({profiles:[profile],runs:[recordDecision(run,{offered:['A','B'],chosenIndex:0})]});
  const merged=mergeStates(stale,other);
  expect(merged.runs[0]?.events).toHaveLength(3);
  expect(merged.profiles[0]?.difficulty).toBe('Torment XII');
 });
 it('keeps runs that exist in only one tab',()=>{
  const p=newProfile('Paladin','Paladin');
  const a=newRun(p,10),b=newRun(p,8);
  const merged=mergeStates(state({runs:[a]}),state({runs:[b]}));
  expect(merged.runs.map(r=>r.id).sort()).toEqual([a.id,b.id].sort());
 });
 it('keeps this tab’s active selections when they still exist',()=>{
  const p=newProfile('Paladin','Paladin'),q=newProfile('Rogue','Rogue');
  const merged=mergeStates(state({profiles:[p,q],activeProfileId:q.id}),state({profiles:[p,q],activeProfileId:p.id}));
  expect(merged.activeProfileId).toBe(q.id);
 });
});

describe('profile ties',()=>{
 const fuller=()=>{
  const p=newProfile('Paladin','Paladin');
  return {...p,activeSplinter:'terror' as const,splinterRank:20,lairBossNodes:['Infernal Deception']};
 };
 const stripped=(p:ReturnType<typeof fuller>)=>({...p,activeSplinter:null,splinterRank:null,lairBossNodes:[]});
 it('a stripped copy with the same updatedAt never replaces a fuller profile',()=>{
  const f=fuller(),mine=state({profiles:[f]}),theirs=state({profiles:[stripped(f)]});
  expect(mergeStates(mine,theirs).profiles[0]).toEqual(mine.profiles[0]);
  expect(mergeStates(theirs,mine).profiles[0]).toEqual(mine.profiles[0]);
 });
 it('reconcile writes the fuller profile back once and then settles',()=>{
  const f=fuller(),mine=state({profiles:[f]}),theirs=state({profiles:[stripped(f)]});
  expect(reconcile(mine,theirs).writeBack?.profiles[0]).toEqual(f);
  expect(reconcile(mine,mine).writeBack).toBeNull();
 });
 it('a newer updatedAt still wins regardless of content',()=>{
  const f=fuller(),s={...stripped(f),updatedAt:new Date(Date.parse(f.updatedAt)+1000).toISOString()};
  expect(mergeStates(state({profiles:[f]}),state({profiles:[s]})).profiles[0]).toEqual(s);
  expect(mergeStates(state({profiles:[s]}),state({profiles:[f]})).profiles[0]).toEqual(s);
 });
});

describe('reconciling another tab’s save',()=>{
 it('writes the union back when a stale tab saved over a newer journal',()=>{
  const p=newProfile('Paladin','Paladin');
  const wave1=recordDecision(newRun(p,10),{offered:['A','B'],chosenIndex:0});
  const wave2=recordDecision(wave1,{offered:['C','D'],chosenIndex:1,observation:{totalAether:85}});
  const mine=state({profiles:[p],runs:[wave2]}),staleWrite=state({profiles:[p],runs:[wave1]});
  const {adopt,writeBack}=reconcile(mine,staleWrite);
  expect(adopt).toBeNull();
  expect(writeBack?.runs[0]?.events).toHaveLength(wave2.events.length);
 });
 it('neither adopts nor writes when only per-tab selections differ',()=>{
  const p=newProfile('Paladin','Paladin'),run=newRun(p,10);
  const mine=state({profiles:[p],runs:[run],activeRunId:run.id}),theirs=state({profiles:[p],runs:[run],activeRunId:null});
  expect(reconcile(mine,theirs)).toEqual({adopt:null,writeBack:null});
 });
 it('adopts newer records from the other tab without writing back',()=>{
  const p=newProfile('Paladin','Paladin'),run=newRun(p,10);
  const {adopt,writeBack}=reconcile(state({profiles:[p]}),state({profiles:[p],runs:[run]}));
  expect(adopt?.runs).toHaveLength(1);
  expect(writeBack).toBeNull();
 });
});

describe('state comparison',()=>{
 it('ignores key order and record order',()=>{
  const p=newProfile('Paladin','Paladin'),q=newProfile('Rogue','Rogue');
  const reordered={...Object.fromEntries(Object.entries(p).reverse())} as typeof p;
  expect(sameState(state({profiles:[p,q]}),state({profiles:[q,reordered]}))).toBe(true);
 });
});
