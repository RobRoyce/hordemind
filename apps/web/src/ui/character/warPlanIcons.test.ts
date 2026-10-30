import {describe,expect,it} from 'vitest';
import {IH_GRAPH,LB_GRAPH} from '../../domain/warPlans';
import {lairBossGraphNodes} from './lairBossView';
import {warPlanGraphNodes} from './warPlanView';
import {ICON_AUTHORS,PLAN_ICONS} from './warPlanIcons';

describe('War Plan icons',()=>{
 it('gives every War Plan upgrade an icon with an author',()=>{
  for(const g of [IH_GRAPH,LB_GRAPH])for(const n of g.nodes.filter(n=>!n.root)){
   expect(PLAN_ICONS[n.name],n.name).toBeDefined();
   expect(ICON_AUTHORS).toContain(PLAN_ICONS[n.name]!.author);
  }
 });
 it('draws an icon in every node of both trees, the roots included',()=>{
  for(const n of [...warPlanGraphNodes(),...lairBossGraphNodes()])expect(n.icon,n.id).toBeDefined();
 });
});
