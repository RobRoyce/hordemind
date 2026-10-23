// Offer definitions are explicit mechanics, never arbitrary tier scores.
// Estimates flagged 'approximate' must be calibrated against live Season 15 runs.
export const offers = [
  {name:"The Anchored Masses",kind:"mass",effect:"anchor",detail:"Mass kills may generate Soulspires.",approximate:true},
  {name:"The Bursting Masses",kind:"mass",effect:"burst",detail:"Two additional Masses at wave start.",approximate:false},
  {name:"The Massing Masses",kind:"mass",effect:"reform",detail:"Masses can reform after destruction.",approximate:false},
  {name:"The Puffing Masses",kind:"mass",effect:"puff",detail:"Mass Aether payout scales with your offer stack.",approximate:false},
  {name:"The Teeming Masses",kind:"mass",effect:"teem",detail:"Mass kills can generate additional events.",approximate:true},
  {name:"The Hellish Masses",kind:"mass",effect:"hellish",detail:"Mass death may summon a Hellborne.",approximate:true},
  {name:"The Exalted Masses",kind:"mass",effect:"exaltedMass",detail:"Bonus Mass Aether.",approximate:true},
  {name:"The Colossal Fiends",kind:"lord",effect:"colossal",detail:"Enhanced Aether Lord payouts.",approximate:true},
  {name:"The Ruthless Lords",kind:"lord",effect:"ruthless",detail:"Additional Aether from Lords.",approximate:true},
  {name:"The Fiendish Legions",kind:"lord",effect:"legions",detail:"Converts Fiend events into Lord opportunities.",approximate:true},
  {name:"The Exalted Fiends",kind:"fiend",effect:"exaltedFiend",detail:"Enhanced Aether Fiend rewards.",approximate:true},
  {name:"The Summoned Lords",kind:"lord",effect:"summonedLord",detail:"More Lord spawns.",approximate:true},
  {name:"The Enduring Lords",kind:"lord",effect:"enduring",detail:"Tougher Lords; possible throughput penalty.",approximate:true},
  {name:"The Burning Hellborne",kind:"hell",effect:"burnHell",detail:"Additional Hellborne and Aether.",approximate:true},
  {name:"The Meteoric Hellborne",kind:"hell",effect:"meteorHell",detail:"Hellfire spawns Hellborne.",approximate:true},
  {name:"The Summoned Hellborne",kind:"hell",effect:"summonHell",detail:"Additional Hellborne.",approximate:true},
  {name:"The Surging Hellborne",kind:"hell",effect:"surgeHell",detail:"Additional Hellborne.",approximate:true},
  {name:"The Ambushing Hellborne",kind:"hell",effect:"ambushHell",detail:"Additional Hellborne payout.",approximate:true},
  {name:"The Exalted Hellborne",kind:"hell",effect:"exaltHell",detail:"Additional Hellborne payout.",approximate:true},
  {name:"The Precious Spires",kind:"spire",effect:"precious",detail:"Spire payout bonus.",approximate:true},
  {name:"The Treasured Spires",kind:"spire",effect:"treasured",detail:"Spire payout bonus.",approximate:true},
  {name:"The Coveted Spires",kind:"spire",effect:"coveted",detail:"Spire payout bonus.",approximate:true},
  {name:"The Hungry Spires",kind:"spire",effect:"hungry",detail:"Spire modifier.",approximate:true},
  {name:"The Draining Spires",kind:"spire",effect:"draining",detail:"Spire modifier.",approximate:true},
  {name:"The Rising Spires",kind:"spire",effect:"rising",detail:"Extra Spire events.",approximate:true},
  {name:"The Exalted Hordes",kind:"event",effect:"hordes",detail:"More event generation.",approximate:true},
  {name:"The Aether Goblins",kind:"event",effect:"goblins",detail:"Additional Goblin rewards.",approximate:true},
  {name:"The Stalking Devil",kind:"event",effect:"stalking",detail:"Immediate Aether opportunity.",approximate:true},
  {name:"The Burning Rain",kind:"hazard",effect:"rain",detail:"Environmental hazard.",approximate:true},
  {name:"The Wrath of Hell",kind:"hazard",effect:"wrath",detail:"Environmental hazard.",approximate:true},
  {name:"Chaotic Offering",kind:"chaos",effect:"chaos",detail:"Changes the next wave into an unknown random Chaos Wave; the specific outcome is NOT selectable.",approximate:true}
].sort((a,b)=>a.name.localeCompare(b.name));
export const byName = Object.fromEntries(offers.map(o=>[o.name,o]));
export const CHAOS_OUTCOMES = [
  {name:"Aether Goblins",weight:1,payout:[110,330]},
  {name:"Chaos Rifts",weight:1,payout:[65,205]},
  {name:"Hellwyrm",weight:1,payout:[50,200]},
  {name:"Other Chaos encounter",weight:2,payout:[50,180]}
];
// Chaos probabilities/payouts are placeholders, NOT published drop rates.
export const defaults={massRate:2.5,fiendRate:2,hellRate:1,spireRate:1,lordRate:.6,secondsPerMass:1.6,secondsPerElite:2.6,secondsPerSpire:8,secondsPerLord:5,chaosScale:1,samples:1200};
export function normalizeOffer(input){const s=String(input||"").trim();return s==="The Chaotic Offering"?"Chaotic Offering":s}
