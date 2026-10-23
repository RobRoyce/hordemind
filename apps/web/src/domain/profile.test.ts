import {describe,it,expect} from 'vitest';
import {newProfile} from './run';
import {toggleWarPlanNode,normalizeBuildUrl,validateProfile} from './profile';

describe('War Plan configuration',()=>{
 it('makes the special offer available exactly when The Black Pact is selected',()=>{
  let p=newProfile('Paladin','Paladin');
  for(const node of ['Method and Madness','Impending Doom','The Black Pact'])p=toggleWarPlanNode(p,node);
  expect(p.specialOfferingAvailable).toBe(true);
  p=toggleWarPlanNode(p,'Impending Doom');
  expect(p.specialOfferingAvailable).toBe(false);
 });
 it('replaces an exclusive alternative instead of keeping both',()=>{
  let p=toggleWarPlanNode(newProfile('Paladin','Paladin'),'Method and Madness');
  p=toggleWarPlanNode(toggleWarPlanNode(p,'Total Chaos'),'Reign in Hell');
  expect(p.warPlanNodes).toEqual(['Method and Madness','Reign in Hell']);
 });
});

describe('build planner URL',()=>{
 it('accepts a bare planner address by assuming https',()=>{
  expect(normalizeBuildUrl('maxroll.gg/d4/planner/xyz')).toEqual({value:'https://maxroll.gg/d4/planner/xyz'});
 });
 it('treats an empty field as no link',()=>{
  expect(normalizeBuildUrl('  ')).toEqual({value:''});
 });
 it('rejects text that is not a web address',()=>{
  expect(normalizeBuildUrl('my build')).toHaveProperty('error');
  expect(normalizeBuildUrl('javascript://alert(1)')).toHaveProperty('error');
 });
});

describe('profile validation',()=>{
 it('reports an invalid field instead of letting it reach storage',()=>{
  const p={...newProfile('Paladin','Paladin'),buildUrl:'not a url'};
  expect(validateProfile(p)).toHaveProperty('error');
  expect(validateProfile(newProfile('Paladin','Paladin'))).toHaveProperty('profile');
 });
});
