import {describe,it,expect} from 'vitest';
import {OFFERS,resolveOffer,searchOffers} from './catalog';

describe('offer search',()=>{
 it('resolves typed names regardless of case or a missing "The"',()=>{
  expect(resolveOffer('puffing masses')?.label).toBe('The Puffing Masses');
  expect(resolveOffer('The Puffing Masses')?.label).toBe('The Puffing Masses');
  expect(resolveOffer('puff')).toBeNull();
 });
 it('ranks confirmed offers above unconfirmed ones that match equally well',()=>{
  expect(searchOffers('burst')[0]?.label).toBe('The Bursting Masses');
  expect(searchOffers('exalted').slice(0,2).every(o=>o.confidence!=='unknown')).toBe(true);
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
 it('lists every offer for an empty query, grouped by family',()=>{
  const list=searchOffers('');
  expect(list).toHaveLength(OFFERS.length);
  const families=list.map(o=>o.family);
  expect(families.filter((f,i)=>i===0||f!==families[i-1])).toEqual([...new Set(families)]);
 });
 it('returns every match, not a truncated page',()=>{
  expect(searchOffers('masses').length).toBe(OFFERS.filter(o=>/masses/i.test(o.label+o.family+o.hint)).length);
  expect(searchOffers('e').length).toBeGreaterThan(20);
 });
 it('includes offers the v1 catalog listed, marked unconfirmed',()=>{
  for(const name of ['The Insatiable Spires','The Corrupting Spires','The Gorging Masses','The Bursting Fiends','The Unstoppable Elite','The Withered Wanderer'])
   expect(resolveOffer(name)?.confidence,name).toBe('unknown');
 });
 it('lists recent offers first for an empty query',()=>{
  const list=searchOffers('',['The Rising Spires','Unknown thing']);
  expect(list[0]?.label).toBe('The Rising Spires');
  expect(new Set(list.map(o=>o.label)).size).toBe(list.length);
 });
});
