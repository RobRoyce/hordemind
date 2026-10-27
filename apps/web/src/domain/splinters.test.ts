import {describe,it,expect} from 'vitest';
import {CharacterProfileSchema,EventSchema} from './schema';
import {newProfile,newRun} from './run';
import {toggleLairBossNode} from './profile';
import {terrorRank} from './splinters';

const base=()=>({...newProfile('A','Paladin'),updatedAt:'2026-10-26T00:00:00.000Z'});
describe('splinter profile fields',()=>{
 it('an old splinterRank becomes an active Terror rank',()=>{
  const p=CharacterProfileSchema.parse({...base(),activeSplinter:undefined,splinterRanks:undefined,splinterRank:20});
  expect(p.activeSplinter).toBe('terror');
  expect(p.splinterRanks).toEqual({terror:20,destruction:null,hatred:null});
  expect('splinterRank' in p).toBe(false);
 });
 it('explicit splinter fields win over a legacy rank',()=>{
  const p=CharacterProfileSchema.parse({...base(),splinterRank:5,activeSplinter:'destruction',splinterRanks:{terror:12,destruction:20,hatred:null}});
  expect(p.activeSplinter).toBe('destruction');
  expect(p.splinterRanks.terror).toBe(12);
 });
 it('ranks stop at 24',()=>{
  expect(CharacterProfileSchema.safeParse({...base(),splinterRanks:{terror:24,destruction:null,hatred:null}}).success).toBe(true);
  expect(CharacterProfileSchema.safeParse({...base(),splinterRanks:{terror:25,destruction:null,hatred:null}}).success).toBe(false);
 });
 it('run snapshots migrate too',()=>{
  const start=newRun(newProfile('A','Paladin'),10).events[0]!;
  const {profile}=start.payload as unknown as {profile:Record<string,unknown>};
  const {splinterRanks:_r,activeSplinter:_a,lairBossNodes:_l,...legacy}=profile;
  const legacyStart={...start,payload:{...start.payload,profile:{...legacy,splinterRank:14}}};
  const parsed=EventSchema.parse(legacyStart);
  expect((parsed.payload as {profile:{splinterRanks:{terror:number}}}).profile.splinterRanks.terror).toBe(14);
 });
 it('Terror bonuses count only while Terror is active',()=>{
  expect(terrorRank({activeSplinter:'terror',splinterRanks:{terror:14,destruction:null,hatred:null}})).toBe(14);
  expect(terrorRank({activeSplinter:'destruction',splinterRanks:{terror:20,destruction:20,hatred:null}})).toBe(0);
  expect(terrorRank({activeSplinter:'terror',splinterRanks:{terror:null,destruction:null,hatred:null}})).toBe(0);
 });
 it('Lair Bosses nodes toggle on and off',()=>{
  const p=toggleLairBossNode(newProfile('A','Paladin'),'Infernal Deception');
  expect(p.lairBossNodes).toEqual(['Infernal Deception']);
  expect(toggleLairBossNode(p,'Infernal Deception').lairBossNodes).toEqual([]);
 });
});
