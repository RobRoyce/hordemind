import {describe,it,expect} from 'vitest';
import {LocalStateSchema} from '../domain/schema';
import {seededState,SLOW_RUNS} from '../../tests/seed.mjs';
import {analyze,analysisFor} from './analyze';

const state=()=>LocalStateSchema.parse(seededState(SLOW_RUNS));

describe('analyze',()=>{
 it('the seed fixture is valid stored state',()=>{
  expect(()=>LocalStateSchema.parse(seededState(SLOW_RUNS))).not.toThrow();
 });
 it('three qualifying runs produce a report card',()=>{
  const s=state(),a=analyze(s.runs,s.profiles[0]!.id,20);
  expect(a.character?.needed).toBe(0);
  expect(a.character?.qualifying).toBe(3);
  expect(a.character?.report?.buckets.readings).toBe(30);
 });
 it('a character without qualifying runs gets an empty state, not an error',()=>{
  const s=LocalStateSchema.parse(seededState({runs:[{...SLOW_RUNS.runs[0]!,totals:[],status:'in_progress',final:null}]}));
  const a=analyze(s.runs,s.profiles[0]!.id,20);
  expect(a.character?.report).toBeNull();
  expect(a.character?.needed).toBe(3);
 });
 it('an in-progress run with enough readings qualifies',()=>{
  const s=LocalStateSchema.parse(seededState({runs:[SLOW_RUNS.runs[0]!,SLOW_RUNS.runs[1]!,{...SLOW_RUNS.runs[2]!,status:'in_progress',final:null}]}));
  const a=analyze(s.runs,s.profiles[0]!.id,20);
  expect(a.character?.qualifying).toBe(3);
  // the in-progress run has 9 readings and no final total
  expect(a.character?.report?.buckets.readings).toBe(29);
 });
 it('an analysis for another character is discarded',()=>{
  const s=state(),a=analyze(s.runs,s.profiles[0]!.id,20);
  expect(analysisFor('other',a)).toBeNull();
  expect(analysisFor(s.profiles[0]!.id,a)).toBe(a);
  expect(analysisFor(null,a)).toBeNull();
 });
 it('an analysis computed with no character is dropped once one is selected',()=>{
  const s=state(),a=analyze(s.runs,null,20);
  expect(analysisFor('x',a)).toBeNull();
  expect(analysisFor(null,a)).toBe(a);
 });
 it("another character's runs stay out of the report card and choices, and game numbers pool both",()=>{
  const a=LocalStateSchema.parse(seededState(SLOW_RUNS));
  const b=LocalStateSchema.parse(seededState({profile:{name:'Other'},runs:[SLOW_RUNS.runs[0]!]}));
  const id=a.profiles[0]!.id;
  const both=analyze([...a.runs,...b.runs],id,20),alone=analyze(a.runs,id,20);
  expect(both.character?.qualifying).toBe(3);
  expect(both.character?.report?.buckets.readings).toBe(30);
  expect(both.character?.overrides).toEqual(alone.character?.overrides);
  const sets=(x:typeof both)=>x.counts.offers.reign.sets+x.counts.offers.chaos.sets+x.counts.offers.neither.sets;
  expect(sets(both)).toBe(sets(alone)+sets(analyze(b.runs,null,20)));
  expect(sets(both)).toBe(40);
 });
});
