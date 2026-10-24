import {describe,expect,it} from 'vitest';
import {NO_SELECTION,pick,reconcile} from './selection';

const all=[true,true,true];

describe('offer selection',()=>{
 it('defaults to the best when the result is fresh',()=>
  expect(reconcile(NO_SELECTION,{filled:all,bestSlot:1,fresh:true})).toEqual({slot:1,source:'default'}));
 it('does not default while the result is stale',()=>
  expect(reconcile(NO_SELECTION,{filled:all,bestSlot:1,fresh:false})).toEqual(NO_SELECTION));
 it('follows a new best while the selection is a default',()=>
  expect(reconcile({slot:1,source:'default'},{filled:all,bestSlot:2,fresh:true})).toEqual({slot:2,source:'default'}));
 it('keeps a player pick when the best changes',()=>
  expect(reconcile(pick(0),{filled:all,bestSlot:2,fresh:true})).toEqual({slot:0,source:'picked'}));
 it('drops a pick whose row was cleared, then falls back to the best',()=>
  expect(reconcile(pick(0),{filled:[false,true,true],bestSlot:2,fresh:true})).toEqual({slot:2,source:'default'}));
 it('re-picking the best counts as picked',()=>
  expect(reconcile(pick(2),{filled:all,bestSlot:2,fresh:true})).toEqual({slot:2,source:'picked'}));
 it('selects nothing without a modeled best',()=>
  expect(reconcile({slot:1,source:'default'},{filled:all,bestSlot:null,fresh:true})).toEqual(NO_SELECTION));
});
