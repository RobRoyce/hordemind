/**
 * The Infernal Hordes War Plan activity tree, transcribed from the owner's Season 15
 * screenshots (2026-10-23). Tooltips are verbatim.
 *
 * A node can be learned once any one of its parents is learned. Nodes in a
 * "choose one" pair exclude each other. Each tree has seven upgrade points (guides).
 */
export type Branch='rewards'|'offers'|'events';
/** What a node changes in a run: the end-of-run loot, the offers shown, or Aether earned. */
export type Affects='rewards'|'offers'|'aether';
export interface WarPlanNode{
 id:string;branch:Branch;parents:readonly string[];
 /** The other node of a "choose one" pair. */
 exclusive?:string;
 tooltip:string;
 affects:Affects;
 /** How HordeMind uses the node, in plain words. */
 use:string;
 /** Grid position within the branch, for drawing the tree. */
 row:number;col:number;
}

export const WAR_PLAN_POINTS=7;
export const SPECIAL_OFFER_NODE='The Black Pact';
export const WAR_PLAN_HOME='War Plans table in Temis, Skovos → Activities → Infernal Hordes';
const MONSTER_POWER='Monster Power increases a Monster\'s Life, Damage, Experience, and Rewards.';
const REWARDS_ONLY='End-of-run rewards only; it doesn\'t change which offer is best.';

export const WAR_PLAN:readonly WarPlanNode[]=[
 // Left branch: end-of-run rewards
 {id:'Exalted Council',branch:'rewards',parents:[],row:0,col:1,affects:'rewards',use:REWARDS_ONLY,
  tooltip:`Bartuc and the Fell Council have +1 Monster Power and drop additional items when slain. ${MONSTER_POWER}`},
 {id:'Council Coffers',branch:'rewards',parents:['Exalted Council'],row:1,col:1,affects:'rewards',use:REWARDS_ONLY,
  tooltip:'The Chest of Talismans will appear after defeating either the Fell Council or Bartuc. At Rank 20 with the Splinter of Terror, the Chest of Talismans now costs 1 Aether.'},
 {id:'Forged in Flame',branch:'rewards',parents:['Council Coffers'],exclusive:'Flawless Find',row:2,col:0,affects:'rewards',use:REWARDS_ONLY,
  tooltip:'Obducite drops instead of Gem Fragments in the Infernal Hordes. You may only select one perk. Obducite is used by the Blacksmith to Masterwork equipment.'},
 {id:'Flawless Find',branch:'rewards',parents:['Council Coffers'],exclusive:'Forged in Flame',row:2,col:1,affects:'rewards',use:REWARDS_ONLY,
  tooltip:'Gem Fragments drop instead of Obducite in the Infernal Hordes. You may only select one perk. Obducite is used by the Blacksmith to Masterwork equipment.'},
 {id:'Infernal Hoard',branch:'rewards',parents:['Council Coffers'],row:2,col:2,affects:'rewards',use:REWARDS_ONLY,
  tooltip:'Defeating either the Fell Council or Bartuc reveals the Hoard of Greater Equipment, which contains a colossal deluge of equipment and other rewards.'},

 // Middle branch: offers and Chaos
 {id:'Method and Madness',branch:'offers',parents:[],row:0,col:1,affects:'offers',
  use:'Changes which offers you see, not what they pay. Your recorded offer sets will show how strong the effect is.',
  tooltip:'Your Infernal Offerings are more likely to share a category with your previous choice.'},
 {id:'Reign in Hell',branch:'offers',parents:['Method and Madness'],exclusive:'Total Chaos',row:1,col:0,affects:'offers',
  use:'Live Run starts with four offer rows. No Chaotic Offering will appear.',
  tooltip:'An additional Infernal Offering appears each wave. However, you suppress Chaos Waves from appearing. You may only select one perk.'},
 {id:'Impending Doom',branch:'offers',parents:['Method and Madness'],row:1,col:1,affects:'aether',
  use:'Simulated: Aether Events spawn at all four locations with 10 s left, and with 30 s left at Splinter rank 14. Offers that make events pay more gain from it.',
  tooltip:'When the current wave has 10 seconds remaining, Aether Events spawn at all locations. At Rank 14 with the Splinter of Terror, Impending Doom also triggers when the current wave has 30 seconds remaining.'},
 {id:'Total Chaos',branch:'offers',parents:['Method and Madness'],exclusive:'Reign in Hell',row:1,col:2,affects:'offers',
  use:'Live Run starts with two offer rows; add the Chaotic Offering when it appears.',
  tooltip:'Chaos Waves appear more frequently. However, one less Infernal Offering appears each wave. You may only select one perk.'},
 {id:'Pulse of Aether',branch:'offers',parents:['Reign in Hell'],exclusive:'Bedlam',row:2,col:0,affects:'aether',
  use:'Its +50 Aether is the same whichever offer you take, so it doesn\'t change recommendations. The +1 Monster Power is not modeled.',
  tooltip:`Suppressing a Chaos Wave grants +50 Aether. All enemies in the Infernal Hordes gain +1 Monster Power. You may only select one perk. ${MONSTER_POWER}`},
 {id:'Bedlam',branch:'offers',parents:['Total Chaos'],exclusive:'Pulse of Aether',row:2,col:2,affects:'aether',
  use:'Adds +50 Aether to the Chaotic Offering\'s estimate. The +1 Monster Power is not modeled.',
  tooltip:`When you enter a Chaos Wave, gain +50 Aether and all enemies in the Infernal Hordes gain +1 Monster Power. You may only select one perk. ${MONSTER_POWER}`},
 {id:SPECIAL_OFFER_NODE,branch:'offers',parents:['Pulse of Aether','Impending Doom','Bedlam'],row:3,col:1,affects:'offers',
  use:'Live Run lets you mark the Pact offer and advises whether to use it now.',
  tooltip:'An ominous altar appears between waves in the Infernal Hordes. It can be invoked only once, and provides an Infernal Offering that shares a category with your previous choice.'},

 // Right branch: extra Aether events
 {id:'Cult of Annihilation',branch:'events',parents:[],row:0,col:1,affects:'aether',
  use:'Doomsayer Aether isn\'t published, so it isn\'t modeled; it is the same whichever offer you take. Doomsayers are dangerous.',
  tooltip:'Doomsayers appear during the Infernal Hordes. Doomsayers are dangerous enemies but also drop Aether. At Rank 5 with the Splinter of Terror, a Doomsayer appears at the start of each wave.'},
 {id:'Scale of Tathamet',branch:'events',parents:['Cult of Annihilation'],row:1,col:1,affects:'aether',
  use:'Not modeled: how Aether from its kills is credited is unknown.',
  tooltip:'Once per wave the Scale of Tathamet may appear, a primordial relic that kills all enemies within the Infernal Hordes.'},
 {id:'Devil\'s Deal',branch:'events',parents:['Scale of Tathamet'],row:2,col:1,affects:'aether',
  use:'Its +200 Aether is the same whichever offer you take, so it doesn\'t change recommendations.',
  tooltip:'At the start of the Infernal Hordes, gain an Infernal Challenge. Completing the Infernal Challenge will grant +200 Aether.'}
];

const BY_ID=new Map(WAR_PLAN.map(n=>[n.id,n]));
export const nodeById=(id:string)=>BY_ID.get(id)??null;

/** Earlier HordeMind versions saved these names. */
const RENAMED:Readonly<Record<string,string>>={'Flawless Finds':'Flawless Find'};
export const normalizeNodes=(nodes:readonly string[])=>[...new Set(nodes.map(n=>RENAMED[n]??n))];

export function available(selected:readonly string[],id:string):boolean{
 const node=nodeById(id);
 return Boolean(node)&&(node!.parents.length===0||node!.parents.some(p=>selected.includes(p)));
}

/**
 * Drops learned nodes that lost their last learned parent, repeatedly. Nodes that already
 * lacked a path (`keep`) stay until the user removes them.
 */
function prune(selected:string[],keep:ReadonlySet<string>):string[]{
 let current=selected;
 for(;;){
  const next=current.filter(id=>!nodeById(id)||keep.has(id)||available(current,id));
  if(next.length===current.length)return next;
  current=next;
 }
}

/** Learns or unlearns a node, as the game allows. Unavailable nodes are ignored. */
export function toggleNode(selected:readonly string[],id:string):string[]{
 const node=nodeById(id);
 if(!node)return [...selected];
 const stranded=new Set(unsupported(selected));
 if(selected.includes(id))return prune(selected.filter(x=>x!==id),stranded);
 if(!available(selected,id))return [...selected];
 return prune([...selected.filter(x=>x!==node.exclusive),id],stranded);
}

/** Learned nodes without a learned path, e.g. saved before prerequisites were enforced. */
export const unsupported=(selected:readonly string[])=>selected.filter(id=>nodeById(id)&&!available(selected,id));
export const pointsUsed=(selected:readonly string[])=>selected.filter(id=>nodeById(id)).length;
