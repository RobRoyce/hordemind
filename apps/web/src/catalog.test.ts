import {describe,it,expect} from 'vitest';
import {DANGER,OFFERS,resolveOffer,searchOffers} from './catalog';

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

describe('bane danger flags',()=>{
 it('flags hazards aimed at the player as high danger',()=>{
  for(const name of ['The Burning Rain','The Wrath of Hell','The Stalking Devil','The Ambushing Hellborne','The Draining Spires'])
   expect(resolveOffer(name)?.danger?.level,name).toBe('high');
 });
 it('flags damage boosts as some danger',()=>{
  for(const name of ['The Puffing Masses','The Bursting Masses','The Exalted Hordes','The Exalted Hellborne'])
   expect(resolveOffer(name)?.danger?.level,name).toBe('some');
 });
 it('leaves banes that only cost time unflagged, since the simulator prices those',()=>{
  for(const name of ['The Massing Masses','The Exalted Fiends','The Surging Hellborne','The Precious Spires'])
   expect(resolveOffer(name)?.danger,name).toBeUndefined();
 });
 it('names only offers that exist in the catalog',()=>{
  for(const name of Object.keys(DANGER))expect(resolveOffer(name)?.label,name).toBe(name);
 });
 it('explains every flag',()=>{
  for(const o of OFFERS)if(o.danger)expect(o.danger.why.length,o.label).toBeGreaterThan(10);
 });
});
