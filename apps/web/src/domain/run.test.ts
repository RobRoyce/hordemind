import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision,append,project,undoChoice,effectiveEvents,endRun,decisionDraft,CLIENT_VERSION} from './run';
import {EventSchema} from './schema';
import type {RunRecord} from './schema';

const blackPact=()=>{const p=newProfile('Paladin','Paladin');p.warPlanNodes=['The Black Pact'];p.specialOfferingAvailable=true;return p};

describe('run timeline: one offer before each wave',()=>{
 it('asks for exactly one decision per wave, starting before wave 1',()=>{
  let run=newRun(newProfile('Paladin','Paladin'),3);
  expect(project(run).nextWave).toBe(1);
  for(let wave=1;wave<=3;wave++){
   expect(project(run).decisionsComplete).toBe(false);
   run=recordDecision(run,{offered:['A','B','C'],chosenIndex:0});
  }
  expect(project(run).decisionsComplete).toBe(true);
  expect(project(run).wavesPlayedAtNextStep).toBe(3);
  expect(()=>recordDecision(run,{offered:['A','B'],chosenIndex:0})).toThrow(/All 3 wave decisions/);
 });
 it('records every offered candidate and the chosen slot',()=>{
  const run=recordDecision(newRun(newProfile('Paladin','Paladin'),10),{offered:['The Puffing Masses','The Anchored Masses','Chaotic Offering'],chosenIndex:0});
  const presented=effectiveEvents(run).find(e=>e.type==='offers_presented');
  expect(presented?.type==='offers_presented'&&presented.payload.offered).toEqual(['The Puffing Masses','The Anchored Masses','Chaotic Offering']);
  expect(project(run).chosen[0]?.payload).toMatchObject({wave:1,chosen:'The Puffing Masses',chosenIndex:0});
 });
 it('allows three regular offers plus Chaos plus a special slot',()=>{
  const run=recordDecision(newRun(blackPact(),10),{offered:['A','B','C','Chaotic Offering','D'],chosenIndex:4,specialSlotIndex:4});
  expect(project(run).specialRemaining).toBe(false);
 });
});

describe('Aether observations',()=>{
 it('stores the reading taken at the offer screen as Aether after the previous wave',()=>{
  let run=recordDecision(newRun(newProfile('Paladin','Paladin'),10),{offered:['A','B'],chosenIndex:0});
  run=recordDecision(run,{offered:['C','D'],chosenIndex:1,observation:{totalAether:120}});
  const observed=effectiveEvents(run).find(e=>e.type==='aether_observed');
  expect(observed?.type==='aether_observed'&&observed.payload).toEqual({afterWave:1,totalAether:120});
  expect(project(run).lastTotalAether).toBe(120);
  expect(project(run).lastObservedWave).toBe(1);
 });
 it('rejects a reading before any wave has been played',()=>{
  const run=newRun(newProfile('Paladin','Paladin'),10);
  expect(()=>recordDecision(run,{offered:['A','B'],chosenIndex:0,observation:{totalAether:5}})).toThrow(/before wave 1/);
 });
 it('rejects a cumulative total lower than an earlier reading, leaving the run unchanged',()=>{
  let run=recordDecision(newRun(newProfile('Paladin','Paladin'),10),{offered:['A','B'],chosenIndex:0});
  run=recordDecision(run,{offered:['C','D'],chosenIndex:0,observation:{totalAether:120}});
  const before=run.events.length;
  expect(()=>recordDecision(run,{offered:['E','F'],chosenIndex:0,observation:{totalAether:90}})).toThrow(/cannot decrease/);
  expect(run.events.length).toBe(before);
 });
 it('keeps unknown event counts distinct from observed zeros',()=>{
  let run=recordDecision(newRun(newProfile('Tester','Druid'),8),{offered:['A','B'],chosenIndex:0});
  run=recordDecision(run,{offered:['C','D'],chosenIndex:0,observation:{totalAether:null,eventCounts:{mass:0}}});
  const observed=effectiveEvents(run).find(e=>e.type==='aether_observed');
  expect(observed?.type==='aether_observed'&&observed.payload.eventCounts).toEqual({mass:0});
  expect(observed?.type==='aether_observed'&&'hellborne' in (observed.payload.eventCounts??{})).toBe(false);
 });
 it('skips the observation event entirely when nothing was observed',()=>{
  let run=recordDecision(newRun(newProfile('Tester','Druid'),8),{offered:['A','B'],chosenIndex:0});
  run=recordDecision(run,{offered:['C','D'],chosenIndex:0,observation:{totalAether:null}});
  expect(effectiveEvents(run).some(e=>e.type==='aether_observed')).toBe(false);
 });
});

describe('journal invariants',()=>{
 it('rejects phantom slots, double decisions and a reused special option',()=>{
  let r=newRun(blackPact(),6);
  expect(()=>recordDecision(r,{offered:['A','B'],chosenIndex:2})).toThrow();
  r=recordDecision(r,{offered:['A','B'],chosenIndex:0,specialSlotIndex:0});
  expect(()=>append(r,'offers_presented',{wave:1,offered:['A','B']})).toThrow(/already recorded/);
  expect(()=>recordDecision(r,{offered:['C','D'],chosenIndex:0,specialSlotIndex:0})).toThrow(/already been used/);
 });
 it('rejects a special slot when the profile has no special offering',()=>{
  const r=newRun(newProfile('Paladin','Paladin'),6);
  expect(()=>recordDecision(r,{offered:['A','B'],chosenIndex:0,specialSlotIndex:0})).toThrow(/no special offering/);
 });
 it('records whether the player followed the recommendation',()=>{
  const r=recordDecision(newRun(newProfile('Paladin','Paladin'),6),{offered:['A','B'],chosenIndex:1,recommendedOffer:'A',modelVersion:'test-model'});
  expect(project(r).chosen[0]?.payload).toMatchObject({followedRecommendation:false,recommendedOffer:'A',modelVersion:'test-model'});
 });
});

describe('undo and corrections',()=>{
 it('suppresses the last decision with an append-only correction',()=>{
  let r=recordDecision(newRun(newProfile('Tester','Rogue'),8),{offered:['A','B'],chosenIndex:0});
  const before=r.events.length;
  r=undoChoice(r);
  expect(r.events.length).toBe(before+1);
  expect(project(r).chosen).toHaveLength(0);
  expect(project(r).nextWave).toBe(1);
 });
 it('undoes the Aether reading entered with that decision and offers it back for editing',()=>{
  let r=recordDecision(newRun(blackPact(),8),{offered:['A','B'],chosenIndex:0});
  r=recordDecision(r,{offered:['C','D','E'],chosenIndex:2,specialSlotIndex:1,observation:{totalAether:75,eventCounts:{mass:4}}});
  expect(decisionDraft(r)).toEqual({offered:['C','D','E'],chosenIndex:2,specialSlotIndex:1,observation:{totalAether:75,eventCounts:{mass:4}}});
  r=undoChoice(r);
  expect(project(r).nextWave).toBe(2);
  expect(project(r).lastTotalAether).toBeNull();
  expect(project(r).specialRemaining).toBe(true);
 });
});

describe('ending a run',()=>{
 it('can be abandoned early, after which no decisions are accepted',()=>{
  let r=recordDecision(newRun(newProfile('Tester','Rogue'),8),{offered:['A','B'],chosenIndex:0});
  r=endRun(r,'abandoned',210);
  expect(r.status).toBe('abandoned');
  expect(()=>recordDecision(r,{offered:['C','D'],chosenIndex:0})).toThrow(/already ended/);
 });
 it('can only be marked completed after every wave decision',()=>{
  let r=recordDecision(newRun(newProfile('Tester','Rogue'),2),{offered:['A','B'],chosenIndex:0});
  expect(()=>endRun(r,'completed',100)).toThrow(/decision for every wave/);
  r=recordDecision(r,{offered:['C','D'],chosenIndex:0,observation:{totalAether:50}});
  expect(()=>endRun(r,'completed',40)).toThrow(/cannot decrease/);
  r=endRun(r,'completed',140);
  expect(r.status).toBe('completed');
  expect(project(r).lastTotalAether).toBe(140);
 });
});

describe('runs recorded by the earlier observe-after-choice flow',()=>{
 it('continue without an observation gate and keep their legacy readings',()=>{
  // Hand-built v1 journal: choice, then a wave_observed reading, then a pending choice without one.
  let r:RunRecord=recordDecision(newRun(newProfile('Legacy','Barbarian'),10),{offered:['A','B'],chosenIndex:0});
  r=append(r,'wave_observed',{wave:1,totalAether:60});
  r=recordDecision(r,{offered:['C','D'],chosenIndex:0});
  r=recordDecision(r,{offered:['E','F'],chosenIndex:1});
  expect(project(r).nextWave).toBe(4);
  expect(project(r).lastTotalAether).toBe(60);
 });
});

describe('choice source: was the recorded row the untouched default?',()=>{
 const baseFields={id:crypto.randomUUID(),runId:crypto.randomUUID(),sequence:1,schemaVersion:1,clientVersion:CLIENT_VERSION,at:new Date().toISOString()};
 it('records whether the choice was the untouched default',()=>{
  const r=recordDecision(newRun(newProfile('Paladin','Paladin'),3),{offered:['A','B'],chosenIndex:0,recommendedOffer:'A',modelVersion:'m',choiceSource:'default'});
  expect(project(r).chosen[0]?.payload.choiceSource).toBe('default');
 });
 it('records a picked row as picked',()=>{
  const r=recordDecision(newRun(newProfile('Paladin','Paladin'),3),{offered:['A','B'],chosenIndex:1,choiceSource:'picked'});
  expect(project(r).chosen[0]?.payload.choiceSource).toBe('picked');
 });
 it('stores null when the caller says nothing',()=>{
  const r=recordDecision(newRun(newProfile('Paladin','Paladin'),3),{offered:['A','B'],chosenIndex:0});
  expect(project(r).chosen[0]?.payload.choiceSource).toBeNull();
 });
 it('reads legacy choices without the field as null',()=>{
  const e=EventSchema.parse({...baseFields,type:'offer_chosen',payload:{wave:1,chosen:'A',chosenIndex:0,usedSpecial:false}});
  expect(e.type==='offer_chosen'&&e.payload.choiceSource).toBeNull();
 });
 it('round-trips a new choice through the schema',()=>{
  const e=EventSchema.parse({...baseFields,type:'offer_chosen',payload:{wave:1,chosen:'A',chosenIndex:0,usedSpecial:false,choiceSource:'picked'}});
  const again=EventSchema.parse(JSON.parse(JSON.stringify(e)));
  expect(again.type==='offer_chosen'&&again.payload.choiceSource).toBe('picked');
  expect(again).toEqual(e);
 });
});
