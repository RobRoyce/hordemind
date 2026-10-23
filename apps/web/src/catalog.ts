// Minimal, patch-tagged reference catalog. Community-guide descriptions
// are not the same as verified Season 15 client tooltips.
export type OfferFamily='Masses'|'Hellborne'|'Lords & Fiends'|'Spires'|'Chaos'|'Other';
export interface OfferRef{ id:string;label:string;family:OfferFamily;hint:string;confidence:'documented'|'provisional'|'unknown'; }
const offer=(label:string,family:OfferFamily,hint:string,confidence:OfferRef['confidence']='provisional'):OfferRef=>({id:label,label,family,hint,confidence});
export const OFFERS:OfferRef[]=[
 offer('The Puffing Masses','Masses','Improves the Aether payout of destroyed Masses. Especially valuable in a deep Mass stack.'),
 offer('The Massing Masses','Masses','Aetheric Masses can reform when destroyed; repeat kills can create follow-up triggers.'),
 offer('The Bursting Masses','Masses','Adds starting Masses each wave; effects compound when Masses are already rewarding.'),
 offer('The Teeming Masses','Masses','Mass destruction can generate another Aether event; confirm whether your tooltip says Fiend or Lord.'),
 offer('The Hellish Masses','Masses','Destroying Masses can create Hellborne encounters.'),
 offer('The Anchored Masses','Masses','Destroying Masses may spawn Soulspires; these require additional clear time.'),
 offer('The Exalted Masses','Masses','Mass reward modifier; verify exact amount in game.'),
 offer('The Colossal Fiends','Lords & Fiends','Higher-value Lord / Fiend interactions; depends on kill speed.'),
 offer('The Ruthless Lords','Lords & Fiends','Boosts Lord-focused rewards.'),
 offer('The Fiendish Legions','Lords & Fiends','Fiend-to-Lord synergy; meaningful if you kill Lords quickly.'),
 offer('The Exalted Fiends','Lords & Fiends','Boosts Fiend rewards.'),
 offer('The Summoned Lords','Lords & Fiends','Generates Lord opportunities; confirm current tooltip.'),
 offer('The Enduring Lords','Lords & Fiends','Harder Lords may reduce clear throughput.'),
 offer('The Exalted Hellborne','Hellborne','Increases Aether per Hellborne kill. Does not spawn Hellborne by itself.'),
 offer('The Burning Hellborne','Hellborne','Hellfire / Hellborne spawn-reward interaction; confirm current tooltip.'),
 offer('The Summoned Hellborne','Hellborne','Additional Hellborne opportunities.'),
 offer('The Meteoric Hellborne','Hellborne','Hellfire / Hellborne event.'),
 offer('The Surging Hellborne','Hellborne','Hellborne modifier; verify current mechanic.'),
 offer('The Ambushing Hellborne','Hellborne','Hellborne trigger / payout interaction.'),
 offer('The Precious Spires','Spires','Increased Spire reward; may compete for wave time.'),
 offer('The Treasured Spires','Spires','Increased Spire rewards.'),
 offer('The Coveted Spires','Spires','Spire-related reward boost.'),
 offer('The Hungry Spires','Spires','Spire modifier.'),
 offer('The Draining Spires','Spires','Spire modifier.'),
 offer('The Rising Spires','Spires','More Spire opportunities.'),
 offer('The Exalted Hordes','Other','Event-generation modifier.'),
 offer('The Aether Goblins','Other','Additional Goblin event rewards.'),
 offer('The Stalking Devil','Other','An additional special encounter.'),
 offer('The Wrath of Hell','Other','Hazard/event modifier.'),
 offer('The Burning Rain','Other','Hazard/event modifier.'),
 offer('Chaotic Offering','Chaos','Random Chaos Wave replaces a normal wave. You cannot know or pick its outcome beforehand.','documented')
].sort((a,b)=>a.label.localeCompare(b.label));

export const WAR_PLAN_NODES=[
 {id:'Method and Madness',path:'Offer control',hint:'Affects which offerings may be presented in later waves; exact probability is uncertain.'},
 {id:'The Black Pact',path:'Offer control',hint:'One-use mid-run special choice. Saving it preserves future option value.'},
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
export const WAR_PLAN_HOME='War Plans table in Temis, Skovos → Infernal Hordes activity tree';
