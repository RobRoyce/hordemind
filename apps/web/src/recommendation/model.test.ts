import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision} from '../domain/run';
import {compareScenario,hasMechanics} from './model';
import {compareRun,scenarioFromRun} from './scenario';

const paladin=()=>{
 const p=newProfile('Regression Paladin','Paladin');
 p.killSpeed='fast';p.mobility='high';p.specialOfferingAvailable=true;
 return p;
};
const state=(history:string[],decisionWave=4)=>({history,totalWaves:10,decisionWave,profile:paladin()});

describe('recommender is present and mechanically grounded',()=>{
 it('compares real selected options, without treating unknown options as zero',()=>{
  const result=compareScenario(state(['The Puffing Masses']),['The Bursting Masses','The Anchored Masses','The Unmodeled Mystery'],180);
  expect(result.assessments).toHaveLength(3);
  expect(result.recommended).not.toBeNull();
  expect(result.conditional).toBe(true);
  expect(result.assessments.find(x=>x.offer==='The Unmodeled Mystery')).toMatchObject({modeled:false});
  expect(result.modelVersion).toMatch(/^s15-.*experimental$/);
 });
 it('detects legitimate zero reward modifier without spawner',()=>{
  const result=compareScenario(state([]),['The Exalted Hellborne','The Bursting Masses'],150);
  const exalted=result.assessments.find(x=>x.offer==='The Exalted Hellborne');
  expect(exalted?.modeled).toBe(true);
  if(exalted?.modeled) {
   expect(exalted.mean).toBe(0);
   expect(exalted.reasons[0]).toMatch(/Nothing in your stack spawns Hellborne/);
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
  if(chaos?.modeled)expect(chaos.reasons[0]).toMatch(/random Chaos Wave. You cannot pick which/);
  expect(hasMechanics('Chaos: Aether Goblins')).toBe(false);
 });
 it('is deterministic for comparable seeded conditions',()=>{
  const s=state(['The Puffing Masses','The Hellish Masses']);
  expect(compareScenario(s,['The Bursting Masses','The Exalted Hellborne'],155))
   .toEqual(compareScenario(s,['The Bursting Masses','The Exalted Hellborne'],155));
 });
 it('uses actual prior recorded choices in the run projection',()=>{
  let run=newRun(paladin(),10);
  run=recordDecision(run,{offered:['The Puffing Masses','The Anchored Masses'],chosenIndex:0});
  const result=compareRun(run,['The Bursting Masses','The Exalted Hellborne'],120);
  expect(result.assessments[0]?.offer).toBe('The Bursting Masses');
  expect(scenarioFromRun(run)).toMatchObject({history:['The Puffing Masses'],decisionWave:2,totalWaves:10});
 });
});

describe('decision horizon: an offer applies from the wave it precedes',()=>{
 it('values the final decision by its effect on the final wave',()=>{
  const bursting=compareScenario(state(['The Puffing Masses'],10),['The Bursting Masses'],150,{sensitivity:false,synergy:false}).assessments[0];
  expect(bursting?.modeled&&bursting.mean).toBeGreaterThan(0);
 });
 it('is worth more with more waves left',()=>{
  const at=(wave:number)=>compareScenario(state([],wave),['The Bursting Masses'],150,{sensitivity:false,synergy:false}).assessments[0];
  const early=at(1),late=at(10);
  expect(early?.modeled&&late?.modeled&&early.mean>late.mean*5).toBe(true);
 });
});

describe('explanations name where the modeled gain comes from',()=>{
 it('does not credit a pick with the Puffing growth every pick provides',()=>{
  const exalted=compareScenario(state(['The Puffing Masses']),['The Exalted Hellborne'],150,{sensitivity:false,synergy:false}).assessments[0];
  expect(exalted?.modeled&&Math.abs(exalted.mean)).toBeLessThan(1);
 });
 it('credits a non-Mass pick that feeds Puffing with more Masses',()=>{
  const hordes=compareScenario(state(['The Puffing Masses','The Bursting Masses']),['The Exalted Hordes'],200,{sensitivity:false,synergy:false}).assessments[0];
  expect(hordes?.modeled&&hordes.reasons[0]).toMatch(/Mass Aether.*Puffing Masses/);
 });
 it('charges Spires against wave time inside a Mass engine',()=>{
  const prior=['The Puffing Masses','The Massing Masses','The Teeming Masses','The Bursting Masses'];
  const anchored=compareScenario(state(prior),['The Anchored Masses'],200,{sensitivity:false,synergy:false}).assessments[0];
  expect(anchored?.modeled&&anchored.reasons.join(' ')).toMatch(/Time spent on its events costs you Aether from Masses/);
 });
});

describe('conditional value and synergy outlook',()=>{
 it('values Exalted Hellborne once a Hellborne source exists',()=>{
  const exalted=compareScenario(state(['The Hellish Masses']),['The Exalted Hellborne'],200,{sensitivity:false,synergy:false}).assessments[0];
  expect(exalted?.modeled&&exalted.mean).toBeGreaterThan(5);
 });
 it('says what a spawner unlocks, without assuming offer probabilities',()=>{
  const hellish=compareScenario(state([]),['The Hellish Masses'],150,{sensitivity:false}).assessments[0];
  expect(hellish?.modeled&&hellish.synergies.map(x=>x.offer)).toContain('The Exalted Hellborne');
  const exalted=hellish?.modeled?hellish.synergies.find(x=>x.offer==='The Exalted Hellborne'):undefined;
  expect(exalted&&exalted.withThis-exalted.without).toBeGreaterThan(5);
  expect(exalted?.without).toBeCloseTo(0,0);
 });
});

describe('uncertainty reporting',()=>{
 it('checks whether the winner survives other timing assumptions',()=>{
  const result=compareScenario(state(['The Puffing Masses']),['The Bursting Masses','The Exalted Hellborne'],150,{synergy:false});
  expect(result.robust).not.toBeNull();
  const best=result.assessments[0];
  expect(best?.modeled&&best.sensitivity).toHaveLength(3);
 });
 it('flags assumed and disputed parameters on the offer itself',()=>{
  const devil=compareScenario(state([]),['The Stalking Devil'],100,{sensitivity:false,synergy:false}).assessments[0];
  expect(devil?.modeled&&devil.assumptions.join(' ')).toMatch(/Disputed/);
 });
});

describe('Black Pact advice',()=>{
 it('reports the premium over the best regular offer',()=>{
  const result=compareScenario(state(['The Puffing Masses'],3),['The Bursting Masses','The Exalted Hellborne'],150,{specialOffer:'The Bursting Masses',sensitivity:false,synergy:false});
  expect(result.pact?.bestRegular).toBe('The Exalted Hellborne');
  expect(result.pact?.premium).toBeGreaterThan(0);
  expect(result.pact?.advice).toMatch(/Save it only if/);
 });
 it('advises keeping the Pact when a regular offer is better',()=>{
  const result=compareScenario(state(['The Puffing Masses'],3),['The Bursting Masses','The Exalted Hellborne'],150,{specialOffer:'The Exalted Hellborne',sensitivity:false,synergy:false});
  expect(result.pact?.premium).toBeLessThanOrEqual(0);
  expect(result.pact?.advice).toMatch(/keep the Pact/);
 });
});

describe('latency',()=>{
 it('compares three offers with sensitivity and synergy within the live budget',()=>{
  const t0=performance.now();
  compareScenario(state(['The Puffing Masses'],1),['The Hellish Masses','The Bursting Masses','The Anchored Masses'],400);
  const ms=performance.now()-t0;
  console.log(`full comparison: ${Math.round(ms)} ms`);
  expect(ms).toBeLessThan(2000);
 });
});
