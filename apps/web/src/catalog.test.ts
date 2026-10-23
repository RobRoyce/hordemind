import {describe,it,expect} from 'vitest';
import {DANGER,OFFERS,resolveOffer,searchOffers} from './catalog';
import gameText from './data/game-text.json';

describe('offer catalog from the game client text',()=>{
 it('has exactly the offers the game defines, with unique ids',()=>{
  expect(OFFERS).toHaveLength(gameText.offers.length);
  expect(new Set(OFFERS.map(o=>o.id)).size).toBe(OFFERS.length);
 });
 it('no longer lists names that do not exist in the game',()=>{
  for(const name of ['The Corrupting Spires','The Bursting Fiends','The Exalted Masses','The Burning Hellborne','The Exalted Elite'])
   expect(resolveOffer(name),name).toBeNull();
 });
 it('tells apart the two offers the game calls The Summoned Hellborne',()=>{
  const both=searchOffers('summoned hellborne');
  expect(both.map(o=>o.bane)).toEqual(expect.arrayContaining(['Hellborne are hunting you','Hellborne can now spawn with Aether Events']));
 });
 it('takes each offer’s category from the game, so Puffing counts the right Mass offers',()=>{
  expect(resolveOffer('The Precious Mass')?.family).toBe('Masses');
  expect(resolveOffer('The Desolate Verge')?.family).toBe('Masses');
  expect(resolveOffer('The Colossal Fiends')?.family).toBe('Fiends');
  expect(resolveOffer('The Summoned Lords')?.family).toBe('Lords');
 });
});

describe('offer search',()=>{
 it('resolves typed names regardless of case or a missing "The", and earlier names',()=>{
  expect(resolveOffer('puffing masses')?.label).toBe('The Puffing Masses');
  expect(resolveOffer('Chaotic Offering')?.label).toBe('The Chaotic Offering');
  expect(resolveOffer('The Gorging Masses')?.label).toBe('The Gorging Mass');
  expect(resolveOffer('puff')).toBeNull();
 });
 it('ranks name prefixes first',()=>{
  expect(searchOffers('puff')[0]?.label).toBe('The Puffing Masses');
  expect(searchOffers('anch')[0]?.label).toBe('The Anchored Masses');
  expect(searchOffers('burst')[0]?.label).toBe('The Bursting Masses');
  expect(searchOffers('chaos')[0]?.label).toBe('The Chaotic Offering');
 });
 it('finds offers by category and effect words',()=>{
  const spires=searchOffers('spire').map(o=>o.label);
  expect(spires).toContain('The Anchored Masses');
  expect(spires.slice(0,3).every(x=>x.includes('Spires'))).toBe(true);
 });
 it('requires every word to match',()=>{
  expect(searchOffers('exalted hell').map(o=>o.label)).toEqual(['The Exalted Hellborne']);
 });
 it('lists every offer for an empty query, grouped by category',()=>{
  const list=searchOffers('');
  expect(list).toHaveLength(OFFERS.length);
  const families=list.map(o=>o.family);
  expect(families.filter((f,i)=>i===0||f!==families[i-1])).toEqual([...new Set(families)]);
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
 it('flags damage boosts and weaker defences as some danger',()=>{
  for(const name of ['The Puffing Masses','The Bursting Masses','The Exalted Hordes','The Wanderer Withered'])
   expect(resolveOffer(name)?.danger?.level,name).toBe('some');
 });
 it('leaves banes that only cost time unflagged, since the simulator prices those',()=>{
  for(const name of ['The Massing Masses','The Exalted Fiends','The Aether Goblins','The Precious Spires'])
   expect(resolveOffer(name)?.danger,name).toBeUndefined();
 });
 it('names only offers that exist in the catalog',()=>{
  for(const name of Object.keys(DANGER))expect(resolveOffer(name)?.label,name).toBe(name);
 });
});
