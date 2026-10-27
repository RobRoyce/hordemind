import {describe,expect,it} from 'vitest';
import {newProfile} from '../../domain/run';
import {bonusState,parseRank} from './splinterView';

describe('splinter view',()=>{
 it('a bonus is active only on the active splinter at its rank',()=>{
  const p={...newProfile('A','Paladin'),activeSplinter:'destruction' as const,splinterRanks:{terror:20,destruction:14,hatred:null}};
  expect(bonusState(p,'destruction',14)).toBe('active');
  expect(bonusState(p,'destruction',20)).toBe('locked');
  expect(bonusState(p,'terror',5)).toBe('reached');
 });
 it('rank input clamps to 0-24 and treats empty as not set',()=>{
  expect(parseRank('')).toBeNull();
  expect(parseRank('30')).toBe(24);
  expect(parseRank('-2')).toBe(0);
  expect(parseRank('abc')).toBeUndefined();
 });
});
