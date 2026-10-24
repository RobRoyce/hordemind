import {describe,expect,it} from 'vitest';
import {nodeById} from '../../domain/warplan';
import {countedUpgrades,nodeState,warPlanGraphNodes} from './warPlanView';

describe('War Plan view',()=>{
 it('marks a choose-one partner as excluded once the other is learned',()=>{
  const learned=['Method and Madness','Reign in Hell'];
  expect(nodeState(learned,'Reign in Hell')).toBe('learned');
  expect(nodeState(learned,'Total Chaos')).toBe('excluded');
  expect(nodeState(learned,'Impending Doom')).toBe('open');
  expect(nodeState(learned,'Bedlam')).toBe('locked');
 });
 it('a node without a learned parent stays locked, even when its partner is learned',()=>
  expect(nodeState(['Method and Madness','Reign in Hell','Pulse of Aether'],'Bedlam')).toBe('locked'));
 it('draws the offers branch with choose-one notes',()=>{
  const nodes=warPlanGraphNodes('offers');
  expect(nodes).toHaveLength(7);
  expect(nodes.find(n=>n.id==='Reign in Hell')?.note).toBe('or Total Chaos');
  expect(nodes.find(n=>n.id==='Method and Madness')?.note).toBeUndefined();
 });
 it('never draws Rewards nodes',()=>{
  for(const branch of ['offers','events'] as const)
   for(const n of warPlanGraphNodes(branch))expect(nodeById(n.id)?.branch).not.toBe('rewards');
 });
 it('counts learned upgrades outside Rewards',()=>{
  expect(countedUpgrades(['Exalted Council','Method and Madness'])).toBe(1);
 });
});
