import {describe,expect,it} from 'vitest';
import {newProfile} from '../../domain/run';
import {bonusState,parseRank} from './splinterView';

describe('splinter view',()=>{
 const prof=(patch:object)=>({...newProfile('A','Paladin'),...patch});
 it('a bonus is active only on the active splinter at its rank with its node learned',()=>{
  const p=prof({activeSplinter:'destruction',splinterRanks:{terror:20,destruction:14,hatred:null},lairBossNodes:['Lair of Runes']});
  expect(bonusState(p,'destruction',14,'Lair of Runes')).toBe('active');
  expect(bonusState(p,'destruction',20,'Exotic Armory')).toBe('locked');
  expect(bonusState(p,'terror',5,'Cult of Annihilation')).toBe('reached');
 });
 it('Terror rank 14 is unlearned until Impending Doom is in the War Plan',()=>{
  const p=prof({activeSplinter:'terror',splinterRanks:{terror:14,destruction:null,hatred:null}});
  expect(bonusState(p,'terror',14,'Impending Doom')).toBe('unlearned');
  expect(bonusState({...p,warPlanNodes:['Impending Doom']},'terror',14,'Impending Doom')).toBe('active');
 });
 it('Destruction rank 20 is unlearned until Exotic Armory is in Lair Bosses',()=>{
  const p=prof({activeSplinter:'destruction',splinterRanks:{terror:null,destruction:20,hatred:null}});
  expect(bonusState(p,'destruction',20,'Exotic Armory')).toBe('unlearned');
  expect(bonusState({...p,lairBossNodes:['Exotic Armory']},'destruction',20,'Exotic Armory')).toBe('active');
 });
 it('rank input clamps to 0-24 and treats empty as not set',()=>{
  expect(parseRank('')).toBeNull();
  expect(parseRank('30')).toBe(24);
  expect(parseRank('-2')).toBe(0);
  expect(parseRank('abc')).toBeUndefined();
 });
});
