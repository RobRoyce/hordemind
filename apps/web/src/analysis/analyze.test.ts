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
  const s=LocalStateSchema.parse(seededState({runs:[{...SLOW_RUNS.runs[0]!,status:'in_progress',final:null}]}));
  const a=analyze(s.runs,s.profiles[0]!.id,20);
  expect(a.character?.report).toBeNull();
  expect(a.character?.needed).toBe(3);
 });
 it('an analysis for another character is discarded',()=>{
  const s=state(),a=analyze(s.runs,s.profiles[0]!.id,20);
  expect(analysisFor('other',a)).toBeNull();
  expect(analysisFor(s.profiles[0]!.id,a)).toBe(a);
  expect(analysisFor(null,a)).toBeNull();
 });
});
