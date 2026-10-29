import {describe,it,expect} from 'vitest';
import {lairBossAvailable,toggleLairBoss,strandedLairBoss} from './lairBossPlan';
import {LB_GRAPH,ROOT} from './warPlans';

const NEXT_TO_ROOT=['Children of Zir',"Grigoire's Gambit",'Lair of Runes','Nemesis Tides','Out of the Cold','Two by Two',"Varshan's Vengeance"];

describe('Lair Bosses War Plan neighbour rules',()=>{
 it('opens the seven upgrades next to the root at the start',()=>{
  expect(LB_GRAPH.nodes.filter(n=>!n.root&&lairBossAvailable([],n.name)).map(n=>n.name).sort()).toEqual(NEXT_TO_ROOT);
 });
 it('ignores a click on an upgrade with no learned neighbour',()=>expect(toggleLairBoss([],'Exotic Armory')).toEqual([]));
 it('opens Exotic Armory from each of its three neighbours',()=>{
  for(const path of [['Nemesis Tides','Infernal Deception'],["Varshan's Vengeance",'Blood of Bartuc'],['Out of the Cold','Dog of Astaroth']])
   expect(lairBossAvailable(path,'Exotic Armory'),path.join(' > ')).toBe(true);
 });
 it('keeps upgrades that still have a path when one is unlearned',()=>{
  const learned=['Nemesis Tides','Infernal Deception','Exotic Armory','Blood of Bartuc',"Varshan's Vengeance"];
  expect(toggleLairBoss(learned,'Nemesis Tides')).toEqual(expect.arrayContaining(['Infernal Deception','Exotic Armory']));
 });
 it('drops upgrades that lose their last path',()=>{
  expect(toggleLairBoss(['Nemesis Tides','Infernal Deception','Exotic Armory'],'Nemesis Tides')).toEqual([]);
 });
 it('reports saved upgrades with no path instead of dropping them',()=>{
  expect(strandedLairBoss(['Infernal Deception'])).toEqual(['Infernal Deception']);
  expect(toggleLairBoss(['Infernal Deception'],'Lair of Runes')).toEqual(expect.arrayContaining(['Infernal Deception','Lair of Runes']));
 });
 it('does not let a stranded upgrade open its neighbours',()=>expect(lairBossAvailable(['Infernal Deception'],'Exotic Armory')).toBe(false));
 it('ignores names outside the tree and the root',()=>{
  expect(toggleLairBoss(['Foo'],'Foo')).toEqual(['Foo']);
  expect(toggleLairBoss([],ROOT)).toEqual([]);
  expect(strandedLairBoss(['Foo'])).toEqual([]);
 });
});
