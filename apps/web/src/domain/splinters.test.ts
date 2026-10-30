import {describe,it,expect} from 'vitest';
import {CharacterProfileSchema,EventSchema} from './schema';
import {newProfile,newRun} from './run';
import {toggleLairBossNode} from './profile';
import {activeRank,terrorRank} from './splinters';

const base=()=>({...newProfile('A','Paladin'),updatedAt:'2026-10-26T00:00:00.000Z'});
describe('splinter profile fields',()=>{
 it('a legacy rank makes Terror active',()=>{
  const {activeSplinter:_a,splinterRanks:_r,...legacy}=base();
  const p=CharacterProfileSchema.parse({...legacy,splinterRank:20});
  expect(p.activeSplinter).toBe('terror');
  expect(p.splinterRanks).toEqual({terror:20,destruction:null,hatred:null});
  expect(p).not.toHaveProperty('splinterRank');
 });
 it('a lone rank belongs to the active splinter',()=>{
  const {splinterRanks:_r,...legacy}=base();
  const p=CharacterProfileSchema.parse({...legacy,activeSplinter:'destruction',splinterRank:14});
  expect(p.activeSplinter).toBe('destruction');
  expect(p.splinterRanks.destruction).toBe(14);
  expect(p.splinterRanks.terror).toBeNull();
 });
 it('an explicit null active splinter stays null',()=>{
  const {splinterRanks:_r,...legacy}=base();
  const p=CharacterProfileSchema.parse({...legacy,activeSplinter:null,splinterRank:5});
  expect(p.activeSplinter).toBeNull();
  expect(p.splinterRanks.terror).toBe(5);
 });
 it('a legacy null rank migrates nothing',()=>{
  const {activeSplinter:_a,splinterRanks:_r,...legacy}=base();
  const p=CharacterProfileSchema.parse({...legacy,splinterRank:null});
  expect(p.activeSplinter).toBeNull();
  expect(p.splinterRanks).toEqual({terror:null,destruction:null,hatred:null});
 });
 it('an unknown active splinter still fails to parse',()=>{
  const {activeSplinter:_a,splinterRanks:_r,...legacy}=base();
  expect(CharacterProfileSchema.safeParse({...legacy,activeSplinter:'bogus',splinterRank:14}).success).toBe(false);
 });
 it('saved splinterRanks win over a stray splinterRank',()=>{
  const p=CharacterProfileSchema.parse({...base(),splinterRanks:{terror:3,destruction:null,hatred:null},splinterRank:20});
  expect(p.splinterRanks.terror).toBe(3);
 });
 it('ranks stop at 24',()=>{
  const ranks=(destruction:number)=>({...base(),splinterRanks:{terror:null,destruction,hatred:null}});
  expect(CharacterProfileSchema.safeParse(ranks(24)).success).toBe(true);
  expect(CharacterProfileSchema.safeParse(ranks(25)).success).toBe(false);
 });
 it('run snapshots migrate too',()=>{
  const start=newRun(newProfile('A','Paladin'),10).events[0]!;
  const {profile}=start.payload as unknown as {profile:Record<string,unknown>};
  const {activeSplinter:_a,splinterRanks:_r,lairBossNodes:_l,...legacy}=profile;
  const legacyStart={...start,payload:{...start.payload,profile:{...legacy,splinterRank:14}}};
  const parsed=EventSchema.parse(legacyStart);
  const saved=(parsed.payload as {profile:{activeSplinter:string;splinterRanks:{terror:number}}}).profile;
  expect(saved.activeSplinter).toBe('terror');
  expect(saved.splinterRanks.terror).toBe(14);
 });
 it('Terror bonuses count only while Terror is active',()=>{
  const ranks={terror:14,destruction:null,hatred:null};
  expect(terrorRank({activeSplinter:'terror',splinterRanks:ranks})).toBe(14);
  expect(terrorRank({activeSplinter:'destruction',splinterRanks:ranks})).toBe(0);
  expect(terrorRank({activeSplinter:'terror',splinterRanks:{...ranks,terror:null}})).toBe(0);
 });
 it('activeRank reads the active splinter only',()=>{
  expect(activeRank({activeSplinter:'destruction',splinterRanks:{terror:null,destruction:20,hatred:null}})).toBe(20);
  expect(activeRank({activeSplinter:null,splinterRanks:{terror:5,destruction:null,hatred:null}})).toBeNull();
 });
 it('Lair Bosses nodes toggle on and off',()=>{
  const p=toggleLairBossNode(toggleLairBossNode(newProfile('A','Paladin'),'Nemesis Tides'),'Infernal Deception');
  expect(p.lairBossNodes).toEqual(['Nemesis Tides','Infernal Deception']);
  expect(toggleLairBossNode(p,'Infernal Deception').lairBossNodes).toEqual(['Nemesis Tides']);
 });
});
