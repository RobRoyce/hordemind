import {LB_GRAPH,ROOT,neighbors} from './warPlans';

const IN_TREE=new Set(LB_GRAPH.nodes.filter(n=>!n.root).map(n=>n.name));

/** Learned upgrades joined to the root through learned upgrades. */
export function lairBossReachable(learned:readonly string[]):Set<string>{
 const on=new Set(learned.filter(id=>IN_TREE.has(id)));
 const seen=new Set<string>();
 const queue=[ROOT];
 for(let id=queue.shift();id!==undefined;id=queue.shift())
  for(const next of neighbors(LB_GRAPH,id))if(on.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
 return seen;
}

/** An unlearned upgrade that touches the root or a reachable upgrade. */
export function lairBossAvailable(learned:readonly string[],id:string):boolean{
 if(!IN_TREE.has(id)||learned.includes(id))return false;
 const reach=lairBossReachable(learned);
 return neighbors(LB_GRAPH,id).some(n=>n===ROOT||reach.has(n));
}

/** Learned upgrades in the tree with no learned path to the root, e.g. saved before the tree was enforced. */
export const strandedLairBoss=(learned:readonly string[]):string[]=>{
 const reach=lairBossReachable(learned);
 return learned.filter(id=>IN_TREE.has(id)&&!reach.has(id));
};

/**
 * Learns an available upgrade, or unlearns one and drops what lost its path. Upgrades that
 * already lacked a path stay until the user removes them. The result follows tree order.
 */
export function toggleLairBoss(learned:readonly string[],id:string):string[]{
 if(!IN_TREE.has(id))return [...learned];
 let next:string[];
 if(learned.includes(id)){
  const before=lairBossReachable(learned);
  const rest=learned.filter(x=>x!==id);
  const after=lairBossReachable(rest);
  next=rest.filter(x=>!before.has(x)||after.has(x));
 }else if(lairBossAvailable(learned,id))next=[...learned,id];
 else return [...learned];
 const on=new Set(next);
 return [...LB_GRAPH.nodes.map(n=>n.name).filter(n=>on.has(n)),...next.filter(n=>!IN_TREE.has(n))];
}
