/**
 * Infernal Hordes mechanics as data, each value tagged with where it comes from.
 *
 * `game`: stated or implied by the Diablo IV client text (src/data/game-text.json).
 * `observed`: reported from Season 15 play by the project owner.
 * `guide`: Warcraft Tavern and Maxroll agree. `disputed`: sources disagree.
 * `assumed`: no source; a modeling choice to be inferred from recorded runs.
 * Offers without modeled effects are absent here and shown as "Not modeled".
 */
import {resolveOffer,type OfferFamily} from '../catalog';

export type Provenance='game'|'observed'|'guide'|'disputed'|'assumed';
export type EventKind='Mass'|'Fiend'|'Lord'|'Spire'|'Hellborne'|'Goblin'|'Butcher'|'Hellfire'|'Chaos'|'Council';
export const EVENT_KINDS:readonly EventKind[]=['Mass','Fiend','Lord','Spire','Hellborne','Goblin','Butcher','Hellfire','Chaos','Council'];

export interface Param{value:number;provenance:Provenance;note?:string}
const game=(value:number,note:string):Param=>({value,provenance:'game',note});
const observed=(value:number,note:string):Param=>({value,provenance:'observed',note});
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
  Council:game(25,'"Defeating The Council grants +25 Aether"'),
  Butcher:guide(100)
 },
 hellborneGroup:guide(3,'Hellborne spawn in threes'),
 /** Aether Events spawn at one of four cardinal points. */
 eventLocations:guide(4,'Aether Events spawn at one of four cardinal points'),
 /** Elite packs among the demons killed while filling the progress bar once. */
 elitesPerFill:assumed(0.5,'Elite spawn rate is unmeasured'),
 /** Ambient Hellfire that Meteoric Hellborne can convert, in Hellborne groups per wave. */
 ambientHellfire:assumed(0.5,'Ambient Hellfire is unmeasured'),
 /** Seconds of demon-killing that fill the progress bar once, spawning one Aether Event. */
 fillSeconds:assumed(5,'Sets roughly 7–9 Aether Events per wave for an average build'),
 /** Share of progress still gained while busy at an event, from demons nearby. */
 progressWhileBusy:assumed(0.35,'Unmeasured'),
 /** Which event a filled progress bar produces. */
 eventWeights:{Mass:assumed(0.48,'Unmeasured'),Fiend:assumed(0.32,'Unmeasured'),Spire:assumed(0.2,'Unmeasured'),Lord:game(0,'Lords appear only with The Summoned Lords: "Aether Lords now spawn"')},
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
 |{kind:'onComplete';from:EventKind;spawn:EventKind|'AetherEvent';chance:Param}
 /** Chance that each Aether Event brings an extra event (Summoned Hellborne, Aether Goblins). */
 |{kind:'withEvents';spawn:EventKind;chance:Param}
 |{kind:'payoutAdd';event:EventKind;amount:Param}
 |{kind:'payoutMult';event:EventKind;factor:Param}
 /** Changes how often the progress bar yields this event type. */
 |{kind:'weightMult';event:EventKind;factor:Param}
 /** Ordinary elites can spawn as this event instead (Fiendish Legions); killed in passing, so no extra event time. */
 |{kind:'replaceElites';spawn:EventKind;chance:Param}
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
 |{kind:'chaos'}
 /** Adds an event type to the mix the progress bar draws from (The Summoned Lords). */
 |{kind:'weightAdd';event:EventKind;weight:Param}
 /** Multiplies how many elites spawn (The Surging Elite). */
 |{kind:'eliteRate';factor:Param}
 /** Seconds added after each kill of this event, e.g. a slow (The Gorging Mass). */
 |{kind:'timeAdd';event:EventKind;seconds:Param}
 /** Aether paid once per run, e.g. on defeating the Council. */
 |{kind:'once';event:EventKind;amount:Param}
 /** Unfinished events of this type carry into the next wave (The Enduring Lords). */
 |{kind:'persist';event:EventKind};

export interface OfferMechanics{
 id:string;
 /** The game's category for this offer; Puffing doubles Mass offers. */
 category:OfferFamily;
 effects:Effect[];
 /** Offers whose value this one changes, for the synergy outlook. */
 complements?:string[];
}

const o=(id:string,effects:Effect[],complements?:string[]):OfferMechanics=>{
 const ref=resolveOffer(id);
 if(!ref)throw new Error(`Mechanics for ${id}, which is not in the game's offer list`);
 return {id:ref.id,category:ref.family,effects,...(complements?{complements}:{})};
};
const HELLBORNE_PAYOFFS=['The Exalted Hellborne','The Ambushing Hellborne','The Summoned Hellborne (spawn with events)','The Summoned Hellborne (hunting you)','The Surging Hellborne'];
const MASS_ENGINE=['The Puffing Masses','The Massing Masses','The Teeming Masses','The Hellish Masses','The Bursting Masses','The Fiendish Masses'];
const SPIRE_PAYOFFS=['The Precious Spires','The Treasured Spires','The Coveted Spires','The Insatiable Spires'];
const COUNCIL=(note:string):Effect=>({kind:'once',event:'Council',amount:game(25,note)});

export const MECHANICS:readonly OfferMechanics[]=[
 // Masses
 o('The Puffing Masses',[{kind:'puffing'}],['The Bursting Masses','The Massing Masses']),
 o('The Massing Masses',[
  {kind:'onComplete',from:'Mass',spawn:'Mass',chance:guide(0.3,'Game text: "a chance to reform"')},
  {kind:'timeMult',event:'Mass',factor:assumed(2,'Bane: "Masses health is greatly increased"; size assumed')}
 ],MASS_ENGINE),
 o('The Bursting Masses',[{kind:'startEvents',event:'Mass',count:game(2,'"Wave start, spawn two Aetheric Masses"')}],MASS_ENGINE),
 o('The Teeming Masses',[{kind:'onComplete',from:'Mass',spawn:'Fiend',chance:guide(0.5,'Game text: "a chance to spawn an Aether Fiend"')}],['The Exalted Fiends','The Colossal Fiends','The Bursting Masses']),
 o('The Hellish Masses',[{kind:'onComplete',from:'Mass',spawn:'Hellborne',chance:guide(0.5,'Game text: "a chance to spawn Hellborne"')}],[...HELLBORNE_PAYOFFS,'The Bursting Masses']),
 o('The Anchored Masses',[{kind:'onComplete',from:'Mass',spawn:'Spire',chance:guide(0.5,'Game text: "a chance to spawn a Soulspire"')}],SPIRE_PAYOFFS),
 o('The Fiendish Masses',[
  {kind:'onComplete',from:'Mass',spawn:'Fiend',chance:game(1,'"Masses spawn an Aether Fiend on death": every Mass, as worded')},
  {kind:'payoutAdd',event:'Mass',amount:game(3,'"Aetheric Masses grant +3 Aether"')}
 ],['The Exalted Fiends','The Colossal Fiends','The Bursting Masses']),
 o('The Gorging Mass',[
  {kind:'onComplete',from:'Mass',spawn:'Mass',chance:game(0.25,'"+25% chance to spawn another mass on death"')},
  {kind:'timeAdd',event:'Mass',seconds:assumed(1,'Bane: "Slaying Aetheric Masses slow you (8s)"; cost per kill assumed')}
 ],MASS_ENGINE),
 o('The Precious Mass',[
  {kind:'onComplete',from:'Mass',spawn:'Spire',chance:game(0.25,'"+25% chance to spawn a Soulspire on death"')},
  {kind:'timeMult',event:'Mass',factor:game(2,'"Aetheric Masses +100% health"')}
 ],SPIRE_PAYOFFS),
 o('The Blighted Verge',[
  {kind:'weightMult',event:'Mass',factor:assumed(1.33,'"Masses spawn more often"; size assumed')},
  {kind:'weightMult',event:'Spire',factor:assumed(0.75,'"Soulspires spawn less often"; 75% as for other Spire offers')}
 ],MASS_ENGINE),
 o('The Desolate Verge',[
  {kind:'weightMult',event:'Spire',factor:assumed(1.33,'"Soulspires spawn more often"; size assumed')},
  {kind:'weightMult',event:'Mass',factor:assumed(0.75,'"Masses spawn less often"; size assumed')}
 ],SPIRE_PAYOFFS),

 // Aether Fiends and Lords
 o('The Exalted Fiends',[
  {kind:'payoutAdd',event:'Fiend',amount:game(2,'"Aether Fiends grant +2 Aether"')},
  {kind:'timeMult',event:'Fiend',factor:assumed(2,'Bane: "greatly increased health"; size assumed')}
 ]),
 o('The Colossal Fiends',[
  {kind:'convert',from:'Fiend',to:'Lord',payoutFactor:game(3,'"Aether Fiends spawn as Aether Lords and drop 3x Aether"; 3× the Lord base assumed')},
  {kind:'hellfireSource',amount:guide(1,'Bane: Lords erupt Hellfire')}
 ],['The Ruthless Lords','The Meteoric Hellborne','The Fiendish Legions']),
 o('The Fiendish Legions',[{kind:'replaceElites',spawn:'Fiend',chance:assumed(0.3,'"Aether Fiends have a chance to spawn in place of Elites"; rate assumed')}],['The Exalted Fiends','The Colossal Fiends','The Surging Elite']),
 o('The Surging Elite',[
  {kind:'payoutAdd',event:'Fiend',amount:game(2,'"Aether Fiends grant +2 Aether"')},
  {kind:'eliteRate',factor:game(2,'Bane: "Chance for Elite Doubled"')}
 ],['The Fiendish Legions']),
 o('The Unstoppable Elite',[{kind:'payoutAdd',event:'Fiend',amount:game(2,'"Aether Fiends grant +2 Aether"')}]),
 o('The Summoned Lords',[
  {kind:'weightAdd',event:'Lord',weight:assumed(0.12,'"Aether Lords now spawn"; how often is assumed')},
  {kind:'payoutAdd',event:'Lord',amount:game(4,'"They grant +4 Aether"')}
 ],['The Ruthless Lords','The Enduring Lords']),
 o('The Ruthless Lords',[{kind:'payoutAdd',event:'Lord',amount:game(5,'"Aether Lords grant +5 Aether"')}]),
 o('The Enduring Lords',[
  {kind:'persist',event:'Lord'},
  {kind:'timeMult',event:'Lord',factor:assumed(2,'Bane: "Aether Lords health is greatly increased"; size assumed')}
 ]),

 // Hellborne
 o('The Exalted Hellborne',[{kind:'payoutAdd',event:'Hellborne',amount:game(1,'"Hellborne grant +1 Aether"')}]),
 o('The Ambushing Hellborne',[{kind:'payoutAdd',event:'Hellborne',amount:game(1,'"Hellborne grant +1 Aether"; the ambushes are not modeled as a spawn source')}]),
 o('The Summoned Hellborne (spawn with events)',[
  {kind:'withEvents',spawn:'Hellborne',chance:guide(0.2,'Game text: "Hellborne can now spawn with Aether Events"')},
  {kind:'payoutAdd',event:'Hellborne',amount:game(1,'"Hellborne grant +1 Aether"')}
 ],HELLBORNE_PAYOFFS),
 o('The Summoned Hellborne (hunting you)',[{kind:'payoutAdd',event:'Hellborne',amount:game(1,'"Hellborne grant +1 Aether"; the hunting Hellborne are not modeled as a spawn source')}]),
 o('The Surging Hellborne',[
  {kind:'groupAdd',event:'Hellborne',count:game(1,'"+1 Hellborne when spawned"')},
  {kind:'timeMult',event:'Hellborne',factor:assumed(1.5,'Bane: "Hellborne health is greatly increased"; size assumed')}
 ]),
 o('The Meteoric Hellborne',[{kind:'hellfireSpawns',spawn:'Hellborne',perSource:assumed(1,'"Hellfire spawns Hellborne"; one group per wave per Hellfire source assumed')}],[...HELLBORNE_PAYOFFS,'The Burning Rain','The Wrath of Hell']),

 // Soulspires
 o('The Precious Spires',[{kind:'payoutMult',event:'Spire',factor:game(2.5,'"Soulspires grant 2.5x Aether"')},{kind:'weightMult',event:'Spire',factor:guide(0.75,'Game text: "spawn less often"')}]),
 o('The Treasured Spires',[{kind:'payoutMult',event:'Spire',factor:game(2.25,'"Soulspires grant 2.25x Aether"')},{kind:'weightMult',event:'Spire',factor:guide(0.75,'Game text: "spawn less often"')}]),
 o('The Coveted Spires',[{kind:'payoutMult',event:'Spire',factor:game(2,'"Soulspires grant 2x Aether"')},{kind:'weightMult',event:'Spire',factor:disputed(0.75,'Game text: "spawn less often"; 75% per Maxroll')}]),
 o('The Insatiable Spires',[
  {kind:'payoutMult',event:'Spire',factor:game(2,'"Soulspires grant 2x Aether"')},
  {kind:'timeMult',event:'Spire',factor:assumed(1.6,'Bane: "Soulspires require +10 kills"; assumes about 15 kills normally')}
 ]),
 o('The Draining Spires',[{kind:'payoutAdd',event:'Spire',amount:game(3,'"Soulspires grant +3 Aether"')}]),
 o('The Hungry Spires',[{kind:'payoutAdd',event:'Spire',amount:assumed(3,'"Enemies killed in range of Soulspires have a chance to drop Aether"; about 3 per Spire assumed')}]),
 o('The Rising Spires',[{kind:'startEvents',event:'Spire',count:game(1,'"Wave start, spawn a Soulspire"')}],SPIRE_PAYOFFS),
 o('The Fiendish Spires',[
  {kind:'onComplete',from:'Spire',spawn:'Fiend',chance:game(1,'"Soulspires spawn an Aether fiend on death": every Spire, as worded')},
  {kind:'payoutAdd',event:'Spire',amount:game(3,'"Soulspires grant +3 Aether"')}
 ],['The Exalted Fiends','The Colossal Fiends']),
 o('The Blighted Spires',[{kind:'onComplete',from:'Spire',spawn:'AetherEvent',chance:assumed(1,'"Soulspires spawn Aether Events"; one per Spire assumed')}],SPIRE_PAYOFFS),

 // Monsters, Hellfire, bosses
 o('The Exalted Hordes',[{kind:'eventRate',add:guide(0.5,'Game text: "Aether Events spawn faster"; 50% per guides')}],MASS_ENGINE),
 o('The Aether Goblins',[
  {kind:'withEvents',spawn:'Goblin',chance:guide(0.2,'Game text: "Aether Events can spawn Aether Goblins"')},
  {kind:'timeMult',event:'Mass',factor:assumed(1.3,'Bane: "Monsters now have greatly increased health"; applied to Mass kills, size assumed')}
 ]),
 o('The Stalking Devil',[{kind:'startEvents',event:'Butcher',firstWaveOnly:true,count:observed(1,'One Burning Butcher per run, not one per wave')}]),
 o('The Burning Rain',[{kind:'waveEnd',min:game(9,'"At the end of each wave spawn 9-15 Aether"'),max:game(15,'"9-15 Aether"')},{kind:'hellfireSource',amount:guide(1,'Bane: "Hellfire rains upon you"')}],['The Meteoric Hellborne']),
 o('The Wrath of Hell',[{kind:'waveEnd',min:game(15,'"At the end of each wave spawn 15-24 additional Aether"'),max:game(24,'"15-24"'),replaces:'The Burning Rain'},{kind:'hellfireSource',amount:guide(1,'Bane: "Hellfire intensifies"')}],['The Meteoric Hellborne']),
 o('The Exalted Council',[COUNCIL('"Defeating them grants +25 Aether"; assumes you fight the Fell Council')]),
 o('The Wanderer Enfeebled',[COUNCIL('"Defeating The Council grants +25 Aether"; assumes you fight the Council')]),
 o('The Wanderer Exhausted',[COUNCIL('"Defeating The Council grants +25 Aether"; assumes you fight the Council')]),
 o('The Wanderer Withered',[COUNCIL('"Defeating The Council grants +25 Aether"; assumes you fight the Council')]),
 o('The Chaotic Offering',[{kind:'chaos'}])
];
const BY_ID=new Map(MECHANICS.map(m=>[m.id,m]));
/** Accepts catalog ids and names earlier versions recorded. */
export const mechanicsFor=(name:string):OfferMechanics|null=>{const ref=resolveOffer(name);return ref?BY_ID.get(ref.id)??null:null};

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

/** War Plan values used by the simulator; tooltips from the owner's S15 screenshots. */
export const WAR_PLAN_EFFECTS={
 Bedlam:observed(50,'Tooltip: +50 Aether when you enter a Chaos Wave'),
 /** Impending Doom spawns Aether Events at all locations with this many seconds left. */
 doomSeconds:observed(10,'Tooltip: Aether Events spawn at all locations with 10 seconds remaining'),
 doomSplinterSeconds:observed(30,'Tooltip: at Splinter of Terror rank 14, also with 30 seconds remaining'),
 doomSplinterRank:observed(14,'Tooltip: Splinter of Terror rank for the 30-second trigger')
} as const;
