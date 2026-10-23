// Offer reference for the picker. Descriptions follow Warcraft Tavern and Maxroll where they
// agree; they are not verified Season 15 client tooltips.
export type OfferFamily='Masses'|'Hellborne'|'Lords & Fiends'|'Spires'|'Chaos'|'Other';
/**
 * A bane that threatens the player rather than costing time. HordeMind flags danger and
 * never prices it: dying carries no penalty (owner, S15), and time-costing banes are
 * already simulated.
 */
export interface Danger{level:'high'|'some';why:string}
export interface OfferRef{ id:string;label:string;family:OfferFamily;hint:string;confidence:'documented'|'provisional'|'unknown';danger?:Danger; }
const offer=(label:string,family:OfferFamily,hint:string,confidence:OfferRef['confidence']='provisional'):OfferRef=>({id:label,label,family,hint,confidence});
export const OFFERS:OfferRef[]=[
 offer('The Puffing Masses','Masses','+1 Aether per Mass for every offer you hold; Mass offers count twice. Bane: Mass damage applies Vulnerable.'),
 offer('The Massing Masses','Masses','Masses have a 30% chance to reform when killed. Bane: Masses have +100% health.'),
 offer('The Bursting Masses','Masses','Two extra Masses at the start of each wave. Bane: Mass damage is unavoidable.'),
 offer('The Teeming Masses','Masses','Each Mass killed has a 50% chance to spawn an Aether Fiend. Bane: knockback when you deal damage.'),
 offer('The Hellish Masses','Masses','Each Mass killed has a 50% chance to spawn Hellborne. Bane: Masses explode on death.'),
 offer('The Anchored Masses','Masses','Each Mass killed has a 50% chance to spawn a Soulspire, which takes time to complete. Bane: Masses attack much faster.'),
 offer('The Exalted Masses','Masses','Mass reward offer; not in current guides, so confirm your tooltip.'),
 offer('The Colossal Fiends','Lords & Fiends','Fiends spawn as Lords that drop 3× Aether. Bane: Lords erupt Hellfire.'),
 offer('The Ruthless Lords','Lords & Fiends','+5 Aether per Lord. Bane: Lords gain health and damage each time they spawn.'),
 offer('The Fiendish Legions','Lords & Fiends','Fiends can replace elites. Bane: elite and Fiend damage +25%.'),
 offer('The Exalted Fiends','Lords & Fiends','+2 Aether per Fiend. Bane: Fiends have +100% health.'),
 offer('The Summoned Lords','Lords & Fiends','Lord offer; not in current guides, so confirm your tooltip.'),
 offer('The Enduring Lords','Lords & Fiends','Lords stay when the wave ends. Bane: Lords have +100% health.'),
 offer('The Exalted Hellborne','Hellborne','+1 Aether per Hellborne; does not spawn Hellborne. Bane: Hellborne damage +25%.'),
 offer('The Burning Hellborne','Hellborne','Hellborne offer listed for S15 by Icy Veins but missing from other guides; confirm your tooltip.'),
 offer('The Summoned Hellborne','Hellborne','Hellborne can arrive with Aether Events (20%); +1 Aether per Hellborne.'),
 offer('The Meteoric Hellborne','Hellborne','Hellfire spawns Hellborne, so it pairs with Hellfire sources. Bane: Hellborne damage +25%.'),
 offer('The Surging Hellborne','Hellborne','+1 Hellborne per spawn. Bane: Hellborne have +50% health.'),
 offer('The Ambushing Hellborne','Hellborne','+1 Aether per Hellborne. Bane: Hellborne can ambush you.'),
 offer('The Precious Spires','Spires','2.5× Soulspire Aether. Bane: Soulspires spawn 75% as often.'),
 offer('The Treasured Spires','Spires','2.25× Soulspire Aether. Bane: Soulspires spawn 75% as often.'),
 offer('The Coveted Spires','Spires','2× Soulspire Aether. Bane: Soulspires spawn less often.'),
 offer('The Hungry Spires','Spires','Enemies killed near a Soulspire have a 33% chance to drop 1 Aether. Bane: Soulspires pull you in.'),
 offer('The Draining Spires','Spires','+3 Aether per Soulspire. Bane: Soulspires drain your life.'),
 offer('The Rising Spires','Spires','A Soulspire spawns at the start of each wave. Bane: Soulspires empower enemies.'),
 offer('The Exalted Hordes','Other','Aether Events spawn 50% faster. Bane: normal monster damage +25%.'),
 offer('The Aether Goblins','Other','Aether Events have a 20% chance to bring a Goblin. Bane: monsters are tougher.'),
 offer('The Stalking Devil','Other','Kill the Burning Butcher once for +100 Aether. Bane: he hunts you.'),
 offer('The Wrath of Hell','Other','15–24 Aether at each wave’s end, replacing Burning Rain’s bonus. Bane: Hellfire intensifies.'),
 offer('The Burning Rain','Other','9–15 Aether at each wave’s end. Bane: Hellfire rains down on you.'),
 offer('Chaotic Offering','Chaos','Random Chaos Wave replaces a normal wave. You cannot know or pick its outcome beforehand.','documented'),
 // Listed by the v1 prototype and older guides; not in current guide tables, so unconfirmed for S15.
 offer('The Insatiable Spires','Spires','Soulspires need twice the kills and pay twice the Aether (one older guide).','unknown'),
 offer('The Corrupting Spires','Spires','Soulspires empower nearby enemies and pull them inward.','unknown'),
 offer('The Gorging Masses','Masses','Mass offer; effect not described in current guides.','unknown'),
 offer('The Bursting Fiends','Lords & Fiends','Aether Fiends explode when killed; also changes elite damage.','unknown'),
 offer('The Surging Elite','Other','Elite offer; effect not described in current guides.','unknown'),
 offer('The Exalted Elite','Other','Elite offer; effect not described in current guides.','unknown'),
 offer('The Unstoppable Elite','Other','Elite offer; effect not described in current guides.','unknown'),
 offer('The Invigorating Hellborne','Hellborne','Hellborne offer; effect not described in current guides.','unknown'),
 offer('The Exalted Council','Other','Harder end boss with better loot; not wave Aether.','unknown'),
 offer('The Enfeebled Wanderer','Other','Wanderer offer; effect not described in current guides.','unknown'),
 offer('The Exhausted Wanderer','Other','Wanderer offer; effect not described in current guides.','unknown'),
 offer('The Withered Wanderer','Other','Wanderer offer; effect not described in current guides.','unknown'),
 offer('The Aether Rush','Other','Aether Event offer; effect not described in current guides.','unknown')
].sort((a,b)=>a.label.localeCompare(b.label));

// HordeMind's reading of each documented bane, not a measurement.
// High: hazards aimed at you. Some: more incoming damage or stronger enemies.
export const DANGER:Readonly<Record<string,Danger>>={
 'The Burning Rain':{level:'high',why:'Hellfire rains down on you'},
 'The Wrath of Hell':{level:'high',why:'Hellfire intensifies around you'},
 'The Stalking Devil':{level:'high',why:'The Burning Butcher hunts you'},
 'The Ambushing Hellborne':{level:'high',why:'Hellborne can ambush you'},
 'The Draining Spires':{level:'high',why:'Soulspires drain your life'},
 'The Colossal Fiends':{level:'high',why:'Lords erupt Hellfire around them'},
 'The Puffing Masses':{level:'some',why:'Mass damage applies Vulnerable'},
 'The Bursting Masses':{level:'some',why:'Mass damage is unavoidable'},
 'The Hellish Masses':{level:'some',why:'Masses explode on death'},
 'The Anchored Masses':{level:'some',why:'Masses attack much faster'},
 'The Ruthless Lords':{level:'some',why:'Lords gain damage each time they spawn'},
 'The Fiendish Legions':{level:'some',why:'Elite and Fiend damage +25%'},
 'The Exalted Hellborne':{level:'some',why:'Hellborne damage +25%'},
 'The Meteoric Hellborne':{level:'some',why:'Hellborne damage +25%'},
 'The Rising Spires':{level:'some',why:'Soulspires empower nearby enemies'},
 'The Exalted Hordes':{level:'some',why:'Normal monster damage +25%'},
 'The Aether Goblins':{level:'some',why:'Monsters are tougher (guides differ: +25% damage or +100% health)'},
 'Chaotic Offering':{level:'some',why:'Chaos Waves are harder than normal waves'},
 'The Corrupting Spires':{level:'some',why:'Soulspires empower nearby enemies'},
 'The Bursting Fiends':{level:'some',why:'Aether Fiends explode when killed'}
};
for(const o of OFFERS){const d=DANGER[o.label];if(d)o.danger=d}

export const WAR_PLAN_NODES=[
 {id:'Method and Madness',path:'Offer control',hint:'Affects which offerings may be presented in later waves; exact probability is uncertain.'},
 {id:'The Black Pact',path:'Offer control',hint:'One extra offer, matched to your most recent pick. One use per run.'},
 {id:'Total Chaos',path:'Chaos',hint:'Favors random Chaos Waves, at a cost to ordinary choice opportunities.'},
 {id:'Bedlam',path:'Chaos',hint:'Additional Chaos Aether opportunity. Verify ranks and values in-game.'},
 {id:'Reign in Hell',path:'Steady strategies',hint:'Alternative to Chaos-focused routing.'},
 {id:'Pulse of Aether',path:'Steady strategies',hint:'Aether for some suppressed Chaos opportunities; tooltip verification needed.'},
 {id:'Cult of Annihilation',path:'Wave events',hint:'Doomsayer interaction and seasonal Splinter bonuses.'},
 {id:'Impending Doom',path:'Wave events',hint:'Doomsayer-related wave effects.'},
 {id:'Council Coffers',path:'Rewards',hint:'Additional end-of-run rewards, not necessarily wave Aether.'},
 {id:'Exalted Council',path:'Rewards',hint:'End-boss encounter modifier.'},
 {id:'Forged in Flame',path:'Materials',hint:'Obducite-focused path.'},
 {id:'Flawless Finds',path:'Materials',hint:'Gem-focused alternative.'}
] as const;
/** Infernal Hordes compass wave caps (Warcraft Tavern, Season 15). */
export const COMPASSES=[[10,'Legendary compass'],[8,'Rare compass'],[6,'Magic compass'],[4,'Fleeting compass']] as const;
export const WAR_PLAN_HOME='War Plans table in Temis, Skovos → Infernal Hordes activity tree';

const fold=(s:string)=>s.toLowerCase().replace(/^the\s+/,'').trim();
const byLabel=new Map(OFFERS.map(o=>[o.label.toLowerCase(),o]));

/** Exact catalog entry for typed text, ignoring case and a leading "The". */
export function resolveOffer(text:string):OfferRef|null{
 const key=text.trim().toLowerCase();
 return byLabel.get(key)??OFFERS.find(o=>fold(o.label)===fold(key))??null;
}

/** Browsing order for the picker: the families players think in, Chaos last. */
const FAMILY_ORDER:readonly OfferFamily[]=['Masses','Spires','Hellborne','Lords & Fiends','Other','Chaos'];
const byFamily=[...OFFERS].sort((a,b)=>FAMILY_ORDER.indexOf(a.family)-FAMILY_ORDER.indexOf(b.family)||a.label.localeCompare(b.label));

/**
 * Ranks offers for the picker. Every query word must match the name, family or
 * description; name matches outrank description matches. An empty query lists
 * recent offers first, then the whole catalog grouped by family.
 */
export function searchOffers(query:string,recent:readonly string[]=[]):OfferRef[]{
 const words=query.toLowerCase().split(/\s+/).filter(w=>w&&w!=='the');
 if(!words.length){
  const recentRefs=recent.map(resolveOffer).filter((o):o is OfferRef=>o!==null);
  return [...new Set([...recentRefs,...byFamily])];
 }
 const scored=OFFERS.map(offer=>{
  const name=fold(offer.label),nameWords=name.split(/\s+/),family=offer.family.toLowerCase(),hint=offer.hint.toLowerCase();
  let score=0;
  for(const w of words){
   if(name.startsWith(w))score+=100;
   else if(nameWords.some(x=>x.startsWith(w)))score+=80;
   else if(name.includes(w))score+=60;
   else if(family.includes(w))score+=40;
   else if(hint.includes(w))score+=20;
   else return {offer,score:0};
  }
  return {offer,score:score+(recent.includes(offer.label)?5:0)};
 });
 // Equal matches: offers confirmed by current guides before unconfirmed ones.
 const unconfirmed=(o:OfferRef)=>o.confidence==='unknown'?1:0;
 return scored.filter(x=>x.score>0).sort((a,b)=>b.score-a.score||unconfirmed(a.offer)-unconfirmed(b.offer)||a.offer.label.localeCompare(b.offer.label)).map(x=>x.offer);
}
