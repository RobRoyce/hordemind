import {lairBossAvailable} from '../../domain/lairBossPlan';
import {LAIR_BOSS_NODES} from '../../domain/splinters';
import {LB_GRAPH,ROOT} from '../../domain/warPlans';
import type {GraphNode,NodeState} from '../kit';
import {LB_ROOT_ICON,PLAN_ICONS} from './warPlanIcons';

const HORDES=new Set(LAIR_BOSS_NODES.map(n=>n.id));

/** The whole Lair Bosses tree for DiamondGraph, in the game's layout, with label boxes estimated at `charWidth` per character. */
export function lairBossGraphNodes(charWidth=8):GraphNode[]{
 return LB_GRAPH.nodes.map(n=>{
  if(n.root)return {id:ROOT,name:ROOT,row:n.row,col:n.col,root:true,labelLines:0,labelWidth:0,icon:LB_ROOT_ICON.icon};
  const mark=HORDES.has(n.name)?'◆ Hordes':undefined;
  return {
   id:n.name,name:n.name,row:n.row,col:n.col,icon:PLAN_ICONS[n.name]?.icon,...(mark?{mark}:{}),
   labelLines:mark?2:1,labelWidth:charWidth*Math.max(n.name.length,mark?.length??0)
  };
 });
}

/** The root and learned upgrades are learned. An upgrade next to the root or to a reachable upgrade is open. */
export function lairBossState(learned:readonly string[],id:string):NodeState{
 if(id===ROOT||learned.includes(id))return 'learned';
 return lairBossAvailable(learned,id)?'open':'locked';
}
