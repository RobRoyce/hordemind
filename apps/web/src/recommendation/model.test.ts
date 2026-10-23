import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision,append} from '../domain/run';
import {compareRun,compareScenario,hasMechanics} from './model';

const paladin=()=>{
 const p=newProfile('Regression Paladin','Paladin');
 p.killSpeed='fast';p.mobility='high';p.specialOfferingAvailable=true;
 return p;
};
const state=(history:string[])=>({history,totalWaves:10,chosenAfterWave:4,profile:paladin()});

describe('recommender is present and mechanically grounded',()=>{
 it('compares real selected options, without treating unknown options as zero',()=>{
  const result=compareScenario(state(['The Puffing Masses']),['The Bursting Masses','The Anchored Masses','The Unmodeled Mystery'],180);
  expect(result.assessments).toHaveLength(3);
  expect(result.recommended).not.toBeNull();
  expect(result.conditional).toBe(true);
  expect(result.assessments.find(x=>x.offer==='The Unmodeled Mystery')).toMatchObject({modeled:false});
  expect(result.modelVersion).toContain('montecarlo');
 });
 it('detects legitimate zero reward modifier without spawner',()=>{
  const result=compareScenario(state([]),['The Exalted Hellborne','The Bursting Masses'],150);
  const exalted=result.assessments.find(x=>x.offer==='The Exalted Hellborne');
  expect(exalted?.modeled).toBe(true);
  if(exalted?.modeled) {
   expect(exalted.mean).toBe(0);
   expect(exalted.reasons.join(' ')).toContain('does not spawn');
  }
 });
 it('Mass stacking can outrank Anchored without a fixed tier score',()=>{
  const prior=['The Puffing Masses','The Massing Masses','The Teeming Masses','The Bursting Masses'];
  const result=compareScenario(state(prior),['The Bursting Masses','The Anchored Masses'],400);
  expect(result.recommended).toBe('The Bursting Masses');
 });
 it('samples Chaos as unknown replacement, not selectable outcome',()=>{
  const result=compareScenario(state([]),['Chaotic Offering','The Bursting Masses'],150);
  const chaos=result.assessments.find(x=>x.offer==='Chaotic Offering');
  expect(chaos?.modeled).toBe(true);
  if(chaos?.modeled)expect(chaos.reasons.join(' ')).toContain('UNKNOWN random Chaos outcome');
  expect(hasMechanics('Chaos: Aether Goblins')).toBe(false);
 });
 it('is deterministic for comparable seeded conditions',()=>{
  const s=state(['The Puffing Masses','The Hellish Masses']);
  expect(compareScenario(s,['The Bursting Masses','The Exalted Hellborne'],155))
   .toEqual(compareScenario(s,['The Bursting Masses','The Exalted Hellborne'],155));
 });
 it('uses actual prior recorded choices in the run projection',()=>{
  let run=newRun(paladin(),10);
  run=recordDecision(run,['The Puffing Masses','The Anchored Masses'],0);
  run=append(run,'wave_observed',{wave:1,totalAether:85});
  const result=compareRun(run,['The Bursting Masses','The Exalted Hellborne'],120);
  expect(result.assessments[0]?.offer).toBe('The Bursting Masses');
 });
});
