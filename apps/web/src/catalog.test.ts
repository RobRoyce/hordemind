import {describe,it,expect} from 'vitest';
import {resolveOffer,searchOffers} from './catalog';

describe('offer search',()=>{
 it('resolves typed names regardless of case or a missing "The"',()=>{
  expect(resolveOffer('puffing masses')?.label).toBe('The Puffing Masses');
  expect(resolveOffer('The Puffing Masses')?.label).toBe('The Puffing Masses');
  expect(resolveOffer('puff')).toBeNull();
 });
 it('ranks name prefixes first',()=>{
  expect(searchOffers('puff')[0]?.label).toBe('The Puffing Masses');
  expect(searchOffers('anch')[0]?.label).toBe('The Anchored Masses');
 });
 it('finds offers by family and mechanic words',()=>{
  const spires=searchOffers('spire').map(o=>o.label);
  expect(spires).toContain('The Anchored Masses');
  expect(spires.slice(0,3).every(x=>x.includes('Spires'))).toBe(true);
  expect(searchOffers('chaos')[0]?.label).toBe('Chaotic Offering');
 });
 it('requires every word to match',()=>{
  expect(searchOffers('exalted hell').map(o=>o.label)).toEqual(['The Exalted Hellborne']);
 });
 it('lists recent offers first for an empty query',()=>{
  const list=searchOffers('',['The Rising Spires','Unknown thing']);
  expect(list[0]?.label).toBe('The Rising Spires');
  expect(new Set(list.map(o=>o.label)).size).toBe(list.length);
 });
});
