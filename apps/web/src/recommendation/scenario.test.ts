import {describe,it,expect} from 'vitest';
import {newProfile,newRun} from '../domain/run';
import {scenarioFromRun} from './scenario';

describe('scenarioFromRun',()=>{
 it('the 30-second Doom trigger needs Terror active',()=>{
  const terror={...newProfile('A','Paladin'),warPlanNodes:['Method and Madness','Impending Doom'],activeSplinter:'terror' as const,splinterRanks:{terror:20,destruction:null,hatred:null}};
  expect(scenarioFromRun(newRun(terror,10)).profile.terrorRank).toBe(20);
  expect(scenarioFromRun(newRun({...terror,activeSplinter:'destruction'},10)).profile.terrorRank).toBe(0);
 });
});
