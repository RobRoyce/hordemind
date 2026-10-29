import {describe,it,expect} from 'vitest';
import {WAR_PLAN,WAR_PLAN_POINTS,available,toggleNode,unsupported,normalizeNodes,nodeById,pointsUsed} from './warplan';

const pick=(...names:string[])=>names.reduce((sel:string[],n)=>toggleNode(sel,n),[]);

describe('Infernal Hordes War Plan tree (owner screenshots, S15)',()=>{
 it('has the three branches that hang off the start node',()=>{
  expect(WAR_PLAN.filter(n=>n.parents.length===0).map(n=>n.id).sort()).toEqual(['Cult of Annihilation','Exalted Council','Method and Madness']);
  expect(WAR_PLAN).toHaveLength(15);
 });
 it('unlocks a node once any one of its parents is learned',()=>{
  expect(available([],'The Black Pact')).toBe(false);
  expect(available(pick('Method and Madness','Impending Doom'),'The Black Pact')).toBe(true);
  expect(available(pick('Method and Madness','Total Chaos','Bedlam'),'The Black Pact')).toBe(true);
 });
 it('ignores a click on a node whose path is not learned',()=>{
  expect(pick('The Black Pact')).toEqual([]);
 });
 it('replaces the other node of a "choose one" pair, and anything only it unlocked',()=>{
  let sel=pick('Method and Madness','Reign in Hell','Pulse of Aether');
  sel=toggleNode(sel,'Total Chaos');
  expect(sel).toEqual(['Method and Madness','Total Chaos']);
  expect(pick('Exalted Council','Council Coffers','Forged in Flame','Flawless Find')).not.toContain('Forged in Flame');
 });
 it('unlearns nodes that lose their only path, but keeps those with another',()=>{
  let sel=pick('Method and Madness','Impending Doom','Reign in Hell','Pulse of Aether','The Black Pact');
  sel=toggleNode(sel,'Impending Doom');
  expect(sel).toContain('The Black Pact');
  sel=toggleNode(sel,'Method and Madness');
  expect(sel).toEqual([]);
 });
 it('counts learned upgrades against the tree’s points',()=>{
  expect(WAR_PLAN_POINTS).toBe(7);
  expect(pick('Cult of Annihilation','Scale of Tathamet','Devil\'s Deal')).toHaveLength(3);
  expect(pointsUsed(['Exalted Council','Method and Madness','Bogus'])).toBe(2);
 });
 it('reports nodes saved before prerequisites existed instead of dropping them',()=>{
  expect(unsupported(['The Black Pact','Method and Madness'])).toEqual(['The Black Pact']);
 });
 it('keeps such nodes when an unrelated upgrade is clicked',()=>{
  expect(toggleNode(['The Black Pact'],'Method and Madness')).toEqual(['The Black Pact','Method and Madness']);
 });
 it('renames nodes saved under earlier names',()=>{
  expect(normalizeNodes(['Flawless Finds','Bedlam'])).toEqual(['Flawless Find','Bedlam']);
 });
 it('keeps every tooltip verbatim with its source',()=>{
  expect(nodeById('Reign in Hell')?.tooltip).toContain('An additional Infernal Offering appears each wave.');
  for(const n of WAR_PLAN)expect(n.tooltip.length,n.id).toBeGreaterThan(20);
 });
});

import gameText from '../data/game-text.json';
describe('War Plan tooltips agree with the game client text',()=>{
 const KEYS:Record<string,string>={BossBoost:'Exalted Council',RuneChest:'Council Coffers',ObduciteBoost:'Forged in Flame',GemBoost:'Flawless Find',
  SuperChest:'Infernal Hoard',LikeBargains:'Method and Madness',Order1:'Reign in Hell',EventRush:'Impending Doom',Chaos1:'Total Chaos',
  Order2:'Pulse of Aether',Chaos2:'Bedlam',Replicator:'The Black Pact',Omens:'Cult of Annihilation',KillCommand:'Scale of Tathamet',Challenges:'Devil\'s Deal'};
 const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
 it('covers every War Plan upgrade in the client',()=>{
  expect(gameText.warPlan.map(w=>KEYS[w.key]).sort()).toEqual(WAR_PLAN.map(n=>n.id).sort());
 });
 for(const w of gameText.warPlan)it(`${KEYS[w.key]} contains the client's wording`,()=>{
  const tooltip=norm(nodeById(KEYS[w.key]!)!.tooltip);
  for(const part of [w.desc,w.seasonal].filter(Boolean))expect(tooltip).toContain(norm(part));
 });
});
