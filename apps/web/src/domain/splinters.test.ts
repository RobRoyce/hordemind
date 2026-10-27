import {describe,it,expect} from 'vitest';
import {CharacterProfileSchema,EventSchema} from './schema';
import {newProfile,newRun} from './run';
import {toggleLairBossNode} from './profile';
import {terrorRank} from './splinters';

const base=()=>({...newProfile('A','Paladin'),updatedAt:'2026-10-26T00:00:00.000Z'});
describe('splinter profile fields',()=>{
 it("a legacy profile's rank makes Terror active",()=>{
  const {activeSplinter:_a,...legacy}=base();
  const p=CharacterProfileSchema.parse({...legacy,splinterRank:20});
  expect(p.activeSplinter).toBe('terror');
  expect(p.splinterRank).toBe(20);
 });
 it('an explicit active splinter is never changed',()=>{
  const p=CharacterProfileSchema.parse({...base(),activeSplinter:'destruction',splinterRank:14});
  expect(p.activeSplinter).toBe('destruction');
  expect(p.splinterRank).toBe(14);
 });
 it('an explicit null active splinter stays null',()=>{
  const p=CharacterProfileSchema.parse({...base(),activeSplinter:null,splinterRank:5});
  expect(p.activeSplinter).toBeNull();
  expect(p.splinterRank).toBe(5);
 });
 it('a legacy null rank migrates nothing',()=>{
  const {activeSplinter:_a,...legacy}=base();
  const p=CharacterProfileSchema.parse({...legacy,splinterRank:null});
  expect(p.activeSplinter).toBeNull();
 });
 it('ranks stop at 24',()=>{
  expect(CharacterProfileSchema.safeParse({...base(),splinterRank:24}).success).toBe(true);
  expect(CharacterProfileSchema.safeParse({...base(),splinterRank:25}).success).toBe(false);
 });
 it('run snapshots migrate too',()=>{
  const start=newRun(newProfile('A','Paladin'),10).events[0]!;
  const {profile}=start.payload as unknown as {profile:Record<string,unknown>};
  const {activeSplinter:_a,lairBossNodes:_l,...legacy}=profile;
  const legacyStart={...start,payload:{...start.payload,profile:{...legacy,splinterRank:14}}};
  const parsed=EventSchema.parse(legacyStart);
  expect((parsed.payload as {profile:{activeSplinter:string}}).profile.activeSplinter).toBe('terror');
 });
 it('Terror bonuses count only while Terror is active',()=>{
  expect(terrorRank({activeSplinter:'terror',splinterRank:14})).toBe(14);
  expect(terrorRank({activeSplinter:'destruction',splinterRank:20})).toBe(0);
  expect(terrorRank({activeSplinter:'terror',splinterRank:null})).toBe(0);
 });
 it('Lair Bosses nodes toggle on and off',()=>{
  const p=toggleLairBossNode(newProfile('A','Paladin'),'Infernal Deception');
  expect(p.lairBossNodes).toEqual(['Infernal Deception']);
  expect(toggleLairBossNode(p,'Infernal Deception').lairBossNodes).toEqual([]);
 });
});
