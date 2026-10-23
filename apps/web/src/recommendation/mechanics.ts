/**
 * Infernal Hordes mechanics as data, each value tagged with where it comes from.
 *
 * `guide`: Warcraft Tavern and Maxroll agree. `disputed`: sources disagree.
 * `assumed`: no public source; a modeling choice to be inferred from recorded runs.
 * Nothing here is verified against the Season 15 client yet.
 */
export type Provenance='guide'|'disputed'|'assumed';
export type EventKind='Mass'|'Fiend'|'Lord'|'Spire'|'Hellborne'|'Goblin'|'Butcher'|'Hellfire'|'Chaos';
export const EVENT_KINDS:readonly EventKind[]=['Mass','Fiend','Lord','Spire','Hellborne','Goblin','Butcher','Hellfire','Chaos'];

export interface Param{value:number;provenance:Provenance;note?:string}
const guide=(value:number,note?:string):Param=>({value,provenance:'guide',...(note?{note}:{})});
const disputed=(value:number,note:string):Param=>({value,provenance:'disputed',note});
const assumed=(value:number,note:string):Param=>({value,provenance:'assumed',note});

export const SOURCES={
 warcraftTavern:'https://www.warcrafttavern.com/d4/infernal-hordes/',
 maxroll:'https://maxroll.gg/d4/resources/infernal-hordes'
} as const;

/** Base rewards and the throughput model. Times are seconds for an average build. */
export const BASE={
 waveSeconds:guide(60),
 aether:{
  Mass:guide(3),Fiend:guide(4),Lord:guide(5),Spire:guide(5),
  Hellborne:guide(2,'Per Hellborne; they spawn in groups'),
  Goblin:disputed(20,'Warcraft Tavern 20, Maxroll 25'),
  Butcher:guide(100)
 },
 hellborneGroup:guide(3,'Hellborne spawn in threes'),
 /** Ambient Hellfire that Meteoric Hellborne can convert, in Hellborne groups per wave. */
 ambientHellfire:assumed(0.5,'Ambient Hellfire is unmeasured'),
 /** Seconds of demon-killing that fill the progress bar once, spawning one Aether Event. */
 fillSeconds:assumed(5,'Sets roughly 7–9 Aether Events per wave for an average build'),
 /** Share of progress still gained while busy at an event, from demons nearby. */
 progressWhileBusy:assumed(0.35,'Unmeasured'),
 /** Which event a filled progress bar produces. */
 eventWeights:{Mass:assumed(0.42,'Unmeasured'),Fiend:assumed(0.28,'Unmeasured'),Spire:assumed(0.18,'Unmeasured'),Lord:assumed(0.12,'Guides list a base Lord value, so Lords occur naturally')},
 /** Seconds to complete an event once there. */
 completion:{
  Mass:assumed(3,'Kill one Aetheric Mass'),Fiend:assumed(3.5,'Kill an Aether Fiend pack'),
  Lord:assumed(6,'Kill an Aether Lord'),Spire:assumed(10,'Kill enemies in range until the Soulspire completes'),
  Hellborne:assumed(4,'Kill a group of Hellborne'),Goblin:assumed(3,'Chase and kill a Goblin'),
  Butcher:assumed(9,'Kill the Burning Butcher')
 } satisfies Partial<Record<EventKind,Param>>,
 /** Travel to an event at one of four arena points, by mobility. */
 travel:{high:assumed(1.2,'Unmeasured'),average:assumed(2.5,'Unmeasured'),low:assumed(4.5,'Unmeasured')},
 /** Multiplies completion and fill time, by clear speed. */
 clearTime:{fast:assumed(0.7,'Unmeasured'),average:assumed(1,'Unmeasured'),slow:assumed(1.5,'Unmeasured')}
};

export type Effect=
 /** Extra events at wave start (Bursting, Rising), or only in the first wave after the pick. */
 |{kind:'startEvents';event:EventKind;count:Param;firstWaveOnly?:boolean}
 /** Chance that an event's completion spawns another (Massing, Teeming, Hellish, Anchored). */
 |{kind:'onComplete';from:EventKind;spawn:EventKind;chance:Param}
 /** Chance that each Aether Event brings an extra event (Summoned Hellborne, Aether Goblins). */
 |{kind:'withEvents';spawn:EventKind;chance:Param}
 |{kind:'payoutAdd';event:EventKind;amount:Param}
 |{kind:'payoutMult';event:EventKind;factor:Param}
 /** Changes how often the progress bar yields this event type. */
 |{kind:'weightMult';event:EventKind;factor:Param}
 /** Adds to the Aether Event spawn rate; stacks additively (Exalted Hordes). */
 |{kind:'eventRate';add:Param}
 /** Bane: an event takes longer, e.g. +100% health. */
 |{kind:'timeMult';event:EventKind;factor:Param}
 /** Fiends spawn as Lords that pay a multiple of the Lord base (Colossal Fiends). */
 |{kind:'convert';from:EventKind;to:EventKind;payoutFactor:Param}
 /** Extra Hellborne per spawn (Surging). */
 |{kind:'groupAdd';event:EventKind;count:Param}
 /** Aether paid at each wave end (Burning Rain, Wrath of Hell). */
 |{kind:'waveEnd';min:Param;max:Param;replaces?:string}
 /** Hellfire spawns Hellborne groups (Meteoric). */
 |{kind:'hellfireSpawns';spawn:EventKind;perSource:Param}
 /** Creates Hellfire, which Meteoric Hellborne converts into Hellborne. */
 |{kind:'hellfireSource';amount:Param}
 /** +1 Aether per Mass for every offering in the stack, Mass offerings counted twice. */
 |{kind:'puffing'}
 |{kind:'chaos'};

export type Category='Masses'|'Lords & Fiends'|'Hellborne'|'Spires'|'Other'|'Chaos';
export interface OfferMechanics{
 id:string;category:Category;effects:Effect[];
 /** Name confirmed by current guides; otherwise it may be renamed or absent in S15. */
 nameConfirmed:boolean;
 /** Offers whose value this one changes, for the synergy outlook. */
 complements?:string[];
}

const o=(id:string,category:Category,effects:Effect[],complements?:string[],nameConfirmed=true):OfferMechanics=>({id,category,effects,nameConfirmed,...(complements?{complements}:{})});
const HELLBORNE_PAYOFFS=['The Exalted Hellborne','The Ambushing Hellborne','The Summoned Hellborne','The Surging Hellborne'];
const MASS_ENGINE=['The Puffing Masses','The Massing Masses','The Teeming Masses','The Hellish Masses','The Bursting Masses'];

export const MECHANICS:readonly OfferMechanics[]=[
 o('The Puffing Masses','Masses',[{kind:'puffing'}],['The Bursting Masses','The Massing Masses']),
 o('The Massing Masses','Masses',[
  {kind:'onComplete',from:'Mass',spawn:'Mass',chance:guide(0.3)},
  {kind:'timeMult',event:'Mass',factor:guide(2,'Bane: Masses have +100% health')}
 ],MASS_ENGINE),
 o('The Bursting Masses','Masses',[{kind:'startEvents',event:'Mass',count:guide(2)}],MASS_ENGINE),
 o('The Teeming Masses','Masses',[{kind:'onComplete',from:'Mass',spawn:'Fiend',chance:guide(0.5,'Spawns an Aether Fiend')}],['The Exalted Fiends','The Colossal Fiends','The Bursting Masses']),
 o('The Hellish Masses','Masses',[{kind:'onComplete',from:'Mass',spawn:'Hellborne',chance:guide(0.5)}],[...HELLBORNE_PAYOFFS,'The Bursting Masses']),
 o('The Anchored Masses','Masses',[{kind:'onComplete',from:'Mass',spawn:'Spire',chance:guide(0.5)}],['The Precious Spires','The Treasured Spires','The Coveted Spires']),
 o('The Exalted Fiends','Lords & Fiends',[
  {kind:'payoutAdd',event:'Fiend',amount:guide(2)},
  {kind:'timeMult',event:'Fiend',factor:guide(2,'Bane: Fiends have +100% health')}
 ]),
 o('The Colossal Fiends','Lords & Fiends',[
  {kind:'convert',from:'Fiend',to:'Lord',payoutFactor:guide(3,'Fiends spawn as Lords and drop 3× Aether')},
  {kind:'hellfireSource',amount:guide(1,'Bane: Lords erupt Hellfire')}
 ],['The Ruthless Lords','The Meteoric Hellborne']),
 o('The Ruthless Lords','Lords & Fiends',[{kind:'payoutAdd',event:'Lord',amount:guide(5)}]),
 o('The Enduring Lords','Lords & Fiends',[{kind:'timeMult',event:'Lord',factor:guide(2,'Bane: Lords have +100% health; boon (Lords persist) not modeled')}]),
 o('The Fiendish Legions','Lords & Fiends',[{kind:'weightMult',event:'Fiend',factor:assumed(1.5,'Fiends may replace elites; rate not published')}]),
 o('The Exalted Hellborne','Hellborne',[{kind:'payoutAdd',event:'Hellborne',amount:guide(1)}]),
 o('The Ambushing Hellborne','Hellborne',[{kind:'payoutAdd',event:'Hellborne',amount:guide(1)}]),
 o('The Summoned Hellborne','Hellborne',[
  {kind:'withEvents',spawn:'Hellborne',chance:guide(0.2,'Hellborne can spawn with Aether Events')},
  {kind:'payoutAdd',event:'Hellborne',amount:guide(1)}
 ],HELLBORNE_PAYOFFS),
 o('The Surging Hellborne','Hellborne',[
  {kind:'groupAdd',event:'Hellborne',count:guide(1)},
  {kind:'timeMult',event:'Hellborne',factor:guide(1.5,'Bane: Hellborne have +50% health')}
 ]),
 o('The Meteoric Hellborne','Hellborne',[{kind:'hellfireSpawns',spawn:'Hellborne',perSource:assumed(1,'One Hellborne group per wave per Hellfire source')}],[...HELLBORNE_PAYOFFS,'The Burning Rain','The Wrath of Hell']),
 o('The Burning Hellborne','Hellborne',[{kind:'payoutAdd',event:'Hellborne',amount:assumed(2,'Name and effect unconfirmed for S15')}],undefined,false),
 o('The Precious Spires','Spires',[{kind:'payoutMult',event:'Spire',factor:guide(2.5)},{kind:'weightMult',event:'Spire',factor:guide(0.75)}]),
 o('The Treasured Spires','Spires',[{kind:'payoutMult',event:'Spire',factor:guide(2.25)},{kind:'weightMult',event:'Spire',factor:guide(0.75)}]),
 o('The Coveted Spires','Spires',[{kind:'payoutMult',event:'Spire',factor:guide(2)},{kind:'weightMult',event:'Spire',factor:disputed(0.75,'"Less often" (Warcraft Tavern), 75% (Maxroll)')}]),
 o('The Draining Spires','Spires',[{kind:'payoutAdd',event:'Spire',amount:guide(3)}]),
 o('The Hungry Spires','Spires',[{kind:'payoutAdd',event:'Spire',amount:assumed(3,'33% chance of 1 Aether per kill in range; assumes ~10 kills')}]),
 o('The Rising Spires','Spires',[{kind:'startEvents',event:'Spire',count:guide(1)}],['The Precious Spires','The Treasured Spires','The Coveted Spires']),
 o('The Exalted Hordes','Other',[{kind:'eventRate',add:guide(0.5,'Aether Events spawn 50% faster')}],MASS_ENGINE),
 o('The Aether Goblins','Other',[{kind:'withEvents',spawn:'Goblin',chance:guide(0.2)}]),
 o('The Stalking Devil','Other',[{kind:'startEvents',event:'Butcher',firstWaveOnly:true,count:disputed(1,'Assumes one Butcher per run; if he returns every wave this offer is worth far more')}]),
 o('The Burning Rain','Other',[{kind:'waveEnd',min:guide(9),max:guide(15)},{kind:'hellfireSource',amount:guide(1,'Hellfire rains down')}],['The Meteoric Hellborne']),
 o('The Wrath of Hell','Other',[{kind:'waveEnd',min:guide(15),max:guide(24),replaces:'The Burning Rain'},{kind:'hellfireSource',amount:guide(1,'Hellfire intensifies')}],['The Meteoric Hellborne']),
 o('Chaotic Offering','Chaos',[{kind:'chaos'}])
];
const BY_ID=new Map(MECHANICS.map(m=>[m.id,m]));
const ALIASES:Record<string,string>={'The Chaotic Offering':'Chaotic Offering'};
export const mechanicsFor=(name:string):OfferMechanics|null=>BY_ID.get(ALIASES[name.trim()]??name.trim())??null;

/**
 * Chaos Wave outcomes. Types follow Maxroll; payout ranges and weights are illustrative
 * placeholders, not drop rates. A Chaos Wave replaces the wave it is chosen for.
 */
export const CHAOS_OUTCOMES:readonly {name:string;weight:Param;low:number;high:number}[]=[
 {name:'Aether Goblins',weight:assumed(1,'Equal weights'),low:110,high:330},
 {name:'Aether Fiends',weight:assumed(1,'Equal weights'),low:60,high:180},
 {name:'Aether Lords',weight:assumed(1,'Equal weights'),low:60,high:190},
 {name:'Carry the Reliquary',weight:assumed(1,'Equal weights'),low:50,high:170},
 {name:'Defend the Mass',weight:assumed(1,'Up to 200 by Mass health'),low:60,high:200},
 {name:'Hell Wyrms',weight:assumed(1,'Equal weights'),low:50,high:180},
 {name:'Wisps and Burning Butcher',weight:assumed(1,'Equal weights'),low:80,high:220}
];

/** War Plan values used by the simulator. */
export const WAR_PLAN_EFFECTS={
 Bedlam:disputed(50,'Community guide: +50 Aether on entering a Chaos Wave')
} as const;
