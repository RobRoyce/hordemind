import {describe,expect,it} from 'vitest';
import {categoryTiles,likelyFamily,offersIn,pactFamily} from './pickerModel';

describe('picker model',()=>{
 it('orders categories by offer count, then the browsing order',()=>
  expect(categoryTiles(null).map(t=>t.family)).toEqual(['Masses','Spires','Hellborne','Monsters','Fiends','Lords','Player bane','Hellfire','Player boon','Council','Special boss','Chaos']));
 it('counts each category from the catalog',()=>
  expect(categoryTiles(null).map(t=>t.count)).toEqual([11,9,6,4,3,3,3,2,2,1,1,1]));
 it('single-offer categories carry their offer',()=>{
  expect(categoryTiles(null).find(t=>t.family==='Chaos')?.only?.label).toBe('The Chaotic Offering');
  expect(categoryTiles(null).find(t=>t.family==='Masses')?.only).toBeNull();
 });
 it('lists offers alphabetically',()=>
  expect(offersIn('Lords').map(o=>o.label)).toEqual(['The Enduring Lords','The Ruthless Lords','The Summoned Lords']));
 it('hints the likely category only with Method and Madness',()=>{
  expect(likelyFamily(['Method and Madness'],'The Puffing Masses')).toBe('Masses');
  expect(likelyFamily([],'The Puffing Masses')).toBeNull();
  expect(likelyFamily(['Method and Madness'],null)).toBeNull();
  expect(likelyFamily(['Method and Madness'],'Something unlisted')).toBeNull();
 });
 it('marks the likely tile without reordering',()=>{
  const t=categoryTiles('Lords');
  expect(t.map(x=>x.family)).toEqual(categoryTiles(null).map(x=>x.family));
  expect(t.filter(x=>x.likely).map(x=>x.family)).toEqual(['Lords']);
 });
 it('the Pact opens at the last pick’s category',()=>{
  expect(pactFamily('The Rising Spires')).toBe('Spires');
  expect(pactFamily(null)).toBeNull();
 });
});
