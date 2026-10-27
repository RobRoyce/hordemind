import type {CharacterProfile} from './schema';

export const SPLINTER_IDS=['terror','destruction','hatred'] as const;
export type SplinterId=typeof SPLINTER_IDS[number];
export const SPLINTER_MAX_RANK=24;

export interface SplinterBonus{rank:number;node:string;where:string;effect:string;note:string;learnedIn:'warPlanNodes'|'lairBossNodes'|null}
export interface Splinter{id:SplinterId;name:string;bonuses:readonly SplinterBonus[];noHordes?:string}

export const SPLINTERS:readonly Splinter[]=[
 {id:'terror',name:'Splinter of Terror',bonuses:[
  {rank:5,node:'Cult of Annihilation',where:'First node of the events branch in the Infernal Hordes War Plan',effect:'A Doomsayer appears at the start of each wave.',note:'Not modeled: Doomsayer Aether is unpublished.',learnedIn:'warPlanNodes'},
  {rank:14,node:'Impending Doom',where:'Second row of the offers branch in the Infernal Hordes War Plan',effect:'Impending Doom also triggers with 30 seconds left.',note:'Included in estimates.',learnedIn:'warPlanNodes'},
  {rank:20,node:'Council Coffers',where:'Second node of the rewards branch in the Infernal Hordes War Plan',effect:'The Chest of Talismans costs 1 Aether.',note:"Rewards only; it doesn't change estimates.",learnedIn:null}
 ]},
 {id:'destruction',name:'Splinter of Destruction',bonuses:[
  {rank:14,node:'Lair of Runes',where:'Next to the root of the Lair Bosses War Plan',effect:'Lair Bosses drop additional Runes.',note:"Reaches a Hordes run only through Belial's ambush (Infernal Deception).",learnedIn:'lairBossNodes'},
  {rank:20,node:'Exotic Armory',where:'Three steps from the root of the Lair Bosses War Plan',effect:'Hoard Chests drop 3 more Unique Items for any class.',note:"Reaches a Hordes run only through Belial's ambush (Infernal Deception).",learnedIn:'lairBossNodes'}
 ]},
 {id:'hatred',name:'Splinter of Hatred',bonuses:[],noHordes:'No Infernal Hordes bonus. Its bonuses act in Nightmare Dungeons, the Pit and Whispers.'}
];

export const LAIR_BOSS_HOME='War Plans table in Temis, Skovos → Activities → Lair Bosses';

export interface LairBossNode{id:string;where:string;effect:string;aether:'none'|'unknown'}
export const LAIR_BOSS_NODES:readonly LairBossNode[]=[
 {id:"Varshan's Vengeance",where:'Next to the root of the Lair Bosses War Plan',effect:'Varshan and his minions can appear in a Chaos Wave.',aether:'unknown'},
 {id:'Blood of Bartuc',where:"Past Varshan's Vengeance in the Lair Bosses War Plan",effect:'The Fell Council gets +1 Monster Power. The Spoils of Greater Equipment can drop Bartuc\'s uniques.',aether:'none'},
 {id:'Infernal Deception',where:'Past Nemesis Tides, which sits next to the root of the Lair Bosses War Plan',effect:'Belial can ambush you after the run.',aether:'none'},
 {id:'Exotic Armory',where:'Three steps from the root of the Lair Bosses War Plan',effect:"Hoard Chests, Belial's included, drop 1 more unique for any class.",aether:'none'},
 {id:'Lair of Runes',where:'Next to the root of the Lair Bosses War Plan',effect:'Lair Bosses, Belial included, get +1 Monster Power and drop more Runes.',aether:'none'},
 {id:'Lair of Plenty',where:'Past Lair of Runes in the Lair Bosses War Plan',effect:'Lair Bosses get +1 Monster Power. The extra Hoard Chest excludes Belial.',aether:'none'}
];

/** Terror's War Plan bonuses apply only while Terror is the active splinter. */
export const terrorRank=(p:Pick<CharacterProfile,'activeSplinter'|'splinterRank'>):number=>p.activeSplinter==='terror'?p.splinterRank??0:0;
