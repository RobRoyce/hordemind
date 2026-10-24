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
  const rising=compareScenario(state(prior),['The Rising Spires'],200,{sensitivity:false,synergy:false}).assessments[0];
  expect(rising?.modeled&&rising.reasons.join(' ')).toMatch(/Time spent on its events costs you Aether from Masses/);
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
 it('flags disputed and in-game-observed parameters on the offer itself',()=>{
  const coveted=compareScenario(state([]),['The Coveted Spires'],100,{sensitivity:false,synergy:false}).assessments[0];
  expect(coveted?.modeled&&coveted.assumptions.join(' ')).toMatch(/Disputed/);
  const devil=compareScenario(state([]),['The Stalking Devil'],100,{sensitivity:false,synergy:false}).assessments[0];
  expect(devil?.modeled&&devil.assumptions.join(' ')).toMatch(/Observed in game: One Burning Butcher per run/);
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

describe('review regressions (timeflow 3.0)',()=>{
 const quick={sensitivity:false,synergy:false} as const;
 it('does not report stack-size growth as synergy',()=>{
  const hordes=compareScenario(state(['The Puffing Masses']),['The Exalted Hordes'],150,{sensitivity:false}).assessments[0];
  const bursting=hordes?.modeled?hordes.synergies.find(x=>x.offer==='The Bursting Masses'):undefined;
  if(bursting)expect(bursting.withThis-bursting.without).toBeLessThan(10);
 });
 it('cannot price the Pact against an unmodeled regular offer',()=>{
  const result=compareScenario(state([],3),['The Bursting Masses','The Unmodeled Mystery'],100,{...quick,specialOffer:'The Bursting Masses'});
  expect(result.pact?.premium).toBeNull();
  expect(result.pact?.advice).toMatch(/not modeled/);
 });
 it('leads with the net loss when an offer costs more than it pays',()=>{
  // Doubled Mass health costs more time than the reforms pay back.
  const massing=compareScenario(state([]),['The Massing Masses'],200,quick).assessments[0];
  expect(massing?.modeled&&massing.mean).toBeLessThan(0);
  expect(massing?.modeled&&massing.reasons[0]).toMatch(/^Costs about \d+ Aether overall/);
 });
 it('explains that Colossal Fiends leaves no Fiends for a Fiend bonus',()=>{
  const fiends=compareScenario(state(['The Colossal Fiends']),['The Exalted Fiends'],150,quick).assessments[0];
  expect(fiends?.modeled&&fiends.reasons[0]).toMatch(/turns every Aether Fiend into an Aether Lord/);
 });
 it('writes plurals and articles correctly',()=>{
  const text=compareScenario(state([]),['The Bursting Masses','The Teeming Masses','The Surging Hellborne'],100,quick).assessments
   .flatMap(x=>x.modeled?x.reasons:[]).join(' ');
  expect(text).toMatch(/Adds 2 Masses at the start/);
  expect(text).toMatch(/chance to spawn an Aether Fiend/);
  expect(text).not.toMatch(/Masss|Hellbornes/);
 });
 it('scores nothing and claims no robustness when no waves remain',()=>{
  const result=compareScenario(state([],12),['The Bursting Masses','The Hellish Masses'],100,{synergy:false});
  expect(result.robust).toBeNull();
  for(const x of result.assessments)if(x.modeled){expect(x.mean).toBe(0);expect(x.reasons[0]).toMatch(/No waves remain/)}
 });
 it('labels Chaos payouts as placeholders',()=>{
  const chaos=compareScenario(state([]),['Chaotic Offering'],100,quick).assessments[0];
  expect(chaos?.modeled&&chaos.assumptions.join(' ')).toMatch(/placeholders/);
 });
});

describe('Fiendish Legions: Fiends replace elites, not other Aether Events',()=>{
 const quick={sensitivity:false,synergy:false} as const;
 it('adds Fiend Aether without taking any from Masses or Spires',()=>{
  const legions=compareScenario(state([]),['The Fiendish Legions'],300,quick).assessments[0];
  expect(legions?.modeled).toBe(true);
  if(legions?.modeled){
   expect(legions.components.Fiend).toBeGreaterThan(5);
   expect(legions.components.Mass).toBeGreaterThan(-1);
   expect(legions.components.Spire).toBeGreaterThan(-1);
   expect(legions.reasons.join(' ')).not.toMatch(/lowers Aether/);
  }
 });
 it('pairs with Colossal Fiends, which turns those Fiends into Lords',()=>{
  const legions=compareScenario(state(['The Colossal Fiends']),['The Fiendish Legions'],300,quick).assessments[0];
  expect(legions?.modeled&&legions.components.Lord).toBeGreaterThan(5);
 });
});

describe('mechanics from the game client text',()=>{
 const quick={sensitivity:false,synergy:false} as const;
 const gain=(history:string[],offer:string,wave=4,n=200)=>{const a=compareScenario(state(history,wave),[offer],n,quick).assessments[0];return a?.modeled?a:null};
 it('has no Aether Lords unless something spawns them',()=>{
  const ruthless=gain([],'The Ruthless Lords');
  expect(ruthless?.mean).toBeCloseTo(0,0);
  expect(ruthless?.reasons[0]).toMatch(/Nothing in your stack spawns Aether Lords/);
  expect(gain(['The Summoned Lords'],'The Ruthless Lords')!.mean).toBeGreaterThan(5);
 });
 it('turns every Mass into an Aether Fiend under The Fiendish Masses',()=>{
  expect(gain([],'The Fiendish Masses')!.components.Fiend).toBeGreaterThan(10);
 });
 it('pays the Council bonus once, however many waves remain',()=>{
  const early=gain([],'The Wanderer Withered',1)!.mean,late=gain([],'The Wanderer Withered',10)!.mean;
  expect(early).toBeCloseTo(25,0);
  expect(late).toBeCloseTo(25,0);
 });
 it('makes The Surging Elite worth more alongside The Fiendish Legions',()=>{
  expect(gain(['The Fiendish Legions'],'The Surging Elite')!.mean).toBeGreaterThan(gain([],'The Surging Elite')!.mean+3);
 });
 it('leaves offers whose effect has no number unscored',()=>{
  const result=compareScenario(state([]),['The Aether Rush','The Invigorating Hellborne','The Bursting Masses'],100,quick);
  expect(result.assessments.filter(a=>!a.modeled).map(a=>a.offer).sort()).toEqual(['The Aether Rush','The Invigorating Hellborne']);
 });
 it('labels every value by source, game text first',()=>{
  const fiendish=gain([],'The Fiendish Masses')!;
  expect(fiendish.assumptions.join(' ')).toMatch(/game's own offer text/);
 });
});

describe('readings of the game text are labelled as readings, not as game facts',()=>{
 const quick={sensitivity:false,synergy:false} as const;
 const notes=(history:string[],offer:string)=>{const a=compareScenario(state(history),[offer],100,quick).assessments[0];return a?.modeled?a.assumptions.join(' '):''};
 it('flags values the text implies but does not state',()=>{
  expect(notes([],'The Fiendish Masses')).toMatch(/Implied by the game text: .*every Mass/);
  expect(notes([],'The Fiendish Spires')).toMatch(/Implied by the game text/);
  expect(notes([],'The Colossal Fiends')).toMatch(/Implied by the game text: .*Lord/);
  expect(notes([],'The Precious Mass')).toMatch(/Implied by the game text: .*health/);
 });
 it('labels the no-natural-Lords rule as a reading too',async()=>{
  const {BASE}=await import('./mechanics');
  expect(BASE.eventWeights.Lord.provenance).toBe('implied');
 });
});

describe('Impending Doom limits faster spawning (owner report)',()=>{
 const quick={sensitivity:false,synergy:false} as const;
 const reasons=(warPlanNodes:string[],splinterRank:number|null=14)=>{
  const a=compareScenario({history:[],totalWaves:10,decisionWave:1,profile:{killSpeed:'fast',mobility:'high',warPlanNodes,splinterRank}},['The Exalted Hordes'],200,quick).assessments[0];
  return a?.modeled?a.reasons.join(' '):'';
 };
 it('says why Exalted Hordes is worth less and what it would be worth without Impending Doom',()=>{
  const text=reasons(['Impending Doom']);
  expect(text).toMatch(/Impending Doom spawns events on a timer in the last 30 seconds of each wave/);
  expect(text).toMatch(/Without Impending Doom this would be worth about \+\d+/);
 });
 it('says extra events replace slow ones, not that they cost time',()=>{
  const text=reasons(['Impending Doom']);
  expect(text).not.toMatch(/Time spent on its events/);
  expect(text).toMatch(/With more events to choose from, you skip some for better-paying ones, so you get less from Spires/);
 });
 it('names the 10-second trigger below Splinter rank 14',()=>{
  expect(reasons(['Impending Doom'],13)).toMatch(/in the last 10 seconds of each wave/);
 });
 it('says nothing about Impending Doom when the War Plan lacks it',()=>{
  expect(reasons([])).not.toMatch(/Impending Doom/);
 });
});

describe('explanations do not report simulation noise as effects',()=>{
 it('never says Exalted Hordes lowers Aether from a category (owner report)',()=>{
  const stacks=[[],['The Puffing Masses'],['The Anchored Masses'],['The Teeming Masses'],['The Massing Masses','The Bursting Masses'],['The Fiendish Legions']];
  const speeds=[['fast','high'],['average','average'],['slow','low']] as const;
  for(const hist of stacks)for(const [killSpeed,mobility] of speeds)for(const wave of [2,8,10]){
   const a=compareScenario({history:hist,totalWaves:10,decisionWave:wave,profile:{killSpeed,mobility,warPlanNodes:[]}},['The Exalted Hordes'],150,{sensitivity:false,synergy:false}).assessments[0];
   expect(a?.modeled&&a.reasons.join(' '),`${hist} ${killSpeed} wave ${wave}`).not.toMatch(/lowers Aether/);
  }
 });
});
