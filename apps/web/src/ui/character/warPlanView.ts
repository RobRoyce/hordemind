import {WAR_PLAN,available,nodeById} from '../../domain/warplan';
import {IH_GRAPH,ROOT} from '../../domain/warPlans';
import type {GraphNode,NodeState} from '../kit';
import {IH_ROOT_ICON,PLAN_ICONS} from './warPlanIcons';

const PLACE=new Map(IH_GRAPH.nodes.map(n=>[n.name,n]));

/** The whole Infernal Hordes tree for DiamondGraph, in the game's layout, with label boxes estimated at `charWidth` per character. */
export function warPlanGraphNodes(charWidth=8):GraphNode[]{
 const root=PLACE.get(ROOT)!;
 return [
  {id:ROOT,name:ROOT,row:root.row,col:root.col,root:true,labelLines:0,labelWidth:0,icon:IH_ROOT_ICON.icon},
  ...WAR_PLAN.map(n=>{
   const {row,col}=PLACE.get(n.id)!;
   const note=n.exclusive?`or ${n.exclusive}`:undefined;
   return {
    id:n.id,name:n.id,row,col,icon:PLAN_ICONS[n.id]?.icon,...(note?{note}:{}),
    labelLines:note?2:1,labelWidth:charWidth*Math.max(n.id.length,note?.length??0)
   };
  })
 ];
}

export const WAR_PLAN_EDGES=IH_GRAPH.edges;

/** Excluded means the choose-one partner is learned. Clicking still swaps it in, as the game allows. The root is always learned. */
export function nodeState(learned:readonly string[],id:string):NodeState{
 if(id===ROOT||learned.includes(id))return 'learned';
 if(!available(learned,id))return 'locked';
 const partner=nodeById(id)?.exclusive;
 return partner&&learned.includes(partner)?'excluded':'open';
}

/** Learned upgrades across every branch. */
export const countedUpgrades=(learned:readonly string[])=>learned.filter(id=>nodeById(id)!==null).length;
