import {WAR_PLAN,nodeById} from '../../domain/warplan';
import type {GraphNode} from '../kit';

export type DrawnBranch='offers'|'events';

/** One branch's nodes for DiamondGraph, with label boxes estimated at `charWidth` per character. */
export function warPlanGraphNodes(branch:DrawnBranch,charWidth=8):GraphNode[]{
 return WAR_PLAN.filter(n=>n.branch===branch).map(n=>{
  const note=n.exclusive?`or ${n.exclusive}`:undefined;
  return {
   id:n.id,name:n.id,row:n.row,col:n.col,parents:n.parents,...(note?{note}:{}),
   labelLines:note?2:1,labelWidth:charWidth*Math.max(n.id.length,note?.length??0)
  };
 });
}

/** Learned upgrades in the drawn branches. Rewards still spend points in game, but HordeMind ignores them. */
export const countedUpgrades=(learned:readonly string[])=>learned.filter(id=>{const n=nodeById(id);return n!==null&&n.branch!=='rewards'}).length;
