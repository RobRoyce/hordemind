import {describe,it,expect} from 'vitest';
import {IH_GRAPH,LB_GRAPH,ROOT,colSpan,neighbors,type PlanGraph} from './warPlans';
import {WAR_PLAN,nodeById} from './warplan';
import {LAIR_BOSS_NODES} from './splinters';

const key=(a:string,b:string)=>[a,b].sort().join('|');
const norm=(t:string)=>t.replace(/\s+/g,' ').trim();
const groups=(g:PlanGraph)=>{
 const by=new Map<number,string[]>();
 for(const n of g.nodes)if(n.group!==null)by.set(n.group,[...(by.get(n.group)??[]),n.name]);
 return [...by.values()].map(v=>v.sort()).sort((a,b)=>(a[0]??'').localeCompare(b[0]??''));
};
const group=(name:string)=>IH_GRAPH.nodes.find(n=>n.name===name)?.group;

describe('War Plan layouts from the game files',()=>{
 it('has 15 Infernal Hordes upgrades, a root, 17 connections and three choose-one pairs',()=>{
  expect(IH_GRAPH.nodes.filter(n=>!n.root)).toHaveLength(15);
  expect(IH_GRAPH.edges).toHaveLength(17);
  expect(groups(IH_GRAPH)).toEqual([['Bedlam','Pulse of Aether'],['Flawless Find','Forged in Flame'],['Reign in Hell','Total Chaos']]);
 });
 it('matches the parents and choose-one pairs in warplan.ts',()=>{
  const fromParents=WAR_PLAN.flatMap(n=>n.parents.length?n.parents.map(p=>key(p,n.id)):[key(ROOT,n.id)]).sort();
  expect(IH_GRAPH.edges.map(([a,b])=>key(a,b)).sort()).toEqual(fromParents);
  for(const n of WAR_PLAN)if(n.exclusive)expect(group(n.id)).toBe(group(n.exclusive));
 });
 it('has 17 Lair Bosses upgrades, a root, 21 connections and no choose-one groups',()=>{
  expect(LB_GRAPH.nodes.filter(n=>!n.root)).toHaveLength(17);
  expect(LB_GRAPH.edges).toHaveLength(21);
  expect(LB_GRAPH.nodes.every(n=>n.group===null)).toBe(true);
 });
 it('puts the root at row 0, column 0, and both trees in seven columns and seven rows',()=>{
  for(const g of [IH_GRAPH,LB_GRAPH]){
   expect(g.nodes.find(n=>n.root)).toMatchObject({row:0,col:0,name:ROOT});
   expect(colSpan(g)).toBe(6);
   expect(Math.max(...g.nodes.map(n=>n.row))).toBe(6);
  }
 });
 it('contains every Lair Bosses upgrade HordeMind reads',()=>{
  for(const n of LAIR_BOSS_NODES)expect(LB_GRAPH.nodes.some(x=>x.name===n.id),n.id).toBe(true);
 });
 it('keeps each warplan.ts tooltip a superset of the client text',()=>{
  for(const n of IH_GRAPH.nodes.filter(n=>!n.root))expect(norm(nodeById(n.name)!.tooltip)).toContain(norm(n.tooltip));
 });
 it('lists the neighbours of a node on either end of an edge',()=>{
  expect(neighbors(LB_GRAPH,'Exotic Armory').sort()).toEqual(['Blood of Bartuc','Dog of Astaroth','Infernal Deception']);
 });
});
