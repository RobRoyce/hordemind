import plans from '../data/war-plans.json';

/** The root node's key and name. */
export const ROOT='root';

/** A War Plan upgrade placed on the game's grid; the root sits at column 0, row 0. */
export interface PlanNode{key:string;name:string;col:number;row:number;group:number|null;root:boolean;tooltip:string;seasonal:string}
/** Nodes plus edges between node names; edges have no direction. */
export interface PlanGraph{nodes:readonly PlanNode[];edges:readonly (readonly [string,string])[]}

function graph(plan:{nodes:PlanNode[];edges:readonly (readonly string[])[]}):PlanGraph{
 const nameOf=new Map(plan.nodes.map(n=>[n.key,n.name]));
 return {nodes:plan.nodes,edges:plan.edges.map(([a,b])=>[nameOf.get(a!)!,nameOf.get(b!)!] as const)};
}

export const IH_GRAPH:PlanGraph=graph(plans.plans.infernalHordes);
export const LB_GRAPH:PlanGraph=graph(plans.plans.lairBosses);

/** Names joined to `id` by one edge. */
export const neighbors=(g:PlanGraph,id:string):string[]=>g.edges.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
