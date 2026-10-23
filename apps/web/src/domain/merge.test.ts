import {describe,it,expect} from 'vitest';
import {mergeStates} from './merge';
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
