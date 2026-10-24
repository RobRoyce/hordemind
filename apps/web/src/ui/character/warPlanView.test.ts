import {describe,expect,it} from 'vitest';
import {nodeById} from '../../domain/warplan';
import {countedUpgrades,warPlanGraphNodes} from './warPlanView';

describe('War Plan view',()=>{
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
