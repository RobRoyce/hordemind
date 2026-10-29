import {describe,expect,it} from 'vitest';
import {ROOT} from '../../domain/warPlans';
import {DEFAULT_LAYOUT,layoutGraph,type Box} from '../kit';
import {WAR_PLAN_EDGES,nodeState,warPlanGraphNodes} from './warPlanView';

const intersects=(p:Box,q:Box)=>p.x<q.x+q.width&&q.x<p.x+p.width&&p.y<q.y+q.height&&q.y<p.y+p.height;

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
 it('treats the root as learned',()=>expect(nodeState([],ROOT)).toBe('learned'));
 it('draws the whole Infernal Hordes tree in the game layout, with choose-one notes',()=>{
  const nodes=warPlanGraphNodes();
  expect(nodes).toHaveLength(16);
  expect(nodes.find(n=>n.id===ROOT)).toMatchObject({root:true,col:0,row:0});
  expect(nodes.find(n=>n.id==='Method and Madness')).toMatchObject({col:0,row:2});
  expect(nodes.find(n=>n.id==='Reign in Hell')?.note).toBe('or Total Chaos');
  expect(nodes.find(n=>n.id==='Method and Madness')?.note).toBeUndefined();
  expect(nodes.find(n=>n.id==='Exalted Council')).toMatchObject({col:-2,row:0});
 });
 it('joins nodes with the game connections',()=>{
  expect(WAR_PLAN_EDGES).toHaveLength(17);
  expect(WAR_PLAN_EDGES).toContainEqual(['Method and Madness',ROOT]);
 });
 it('keeps desktop labels clear of each other and of other nodes',()=>{
  const L=layoutGraph(warPlanGraphNodes(),WAR_PLAN_EDGES,DEFAULT_LAYOUT);
  const diamond=(n:typeof L.nodes[number]):Box=>({x:n.x-n.r,y:n.y-n.r,width:2*n.r,height:2*n.r});
  for(const a of L.nodes)for(const b of L.nodes){
   if(a===b||!a.label)continue;
   expect(intersects(a.label,diamond(b)),`${a.id} label covers ${b.id}`).toBe(false);
   if(b.label)expect(intersects(a.label,b.label),`${a.id} label overlaps ${b.id}`).toBe(false);
  }
 });
});
