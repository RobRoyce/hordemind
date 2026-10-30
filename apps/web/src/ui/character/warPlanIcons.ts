import type {IconType} from 'react-icons';
import {
 GiAnvil,GiBlackKnightHelm,GiBlood,GiBrainstorm,GiBurningEmbers,GiCastle,GiCultist,GiDevilMask,GiDragonOrb,GiFangedSkull,
 GiFrozenBody,GiGems,GiGoldStack,GiHighTide,GiHound,GiLockedChest,GiMaggot,GiMagicPortal,GiOpenChest,GiOpenTreasureChest,
 GiPentacle,GiPulse,GiRuneStone,GiSandsOfTime,GiScrollUnfurled,GiSharpCrown,GiSpikedArmor,GiStarAltar,GiThroneKing,
 GiTowerFlag,GiTwoShadows,GiUnstableOrb,GiVampireDracula,GiVortex
} from 'react-icons/gi';

/** Game Icons artists whose icons the War Plans use. */
export type IconAuthor='Lorc'|'Delapouite'|'Skoll'|'Sbed';
/** `name` is the icon's title on game-icons.net. */
export interface PlanIcon{icon:IconType;name:string;author:IconAuthor}

export const ICON_AUTHORS:readonly IconAuthor[]=['Lorc','Delapouite','Skoll','Sbed'];

export const IH_ROOT_ICON:PlanIcon={icon:GiTowerFlag,name:'Tower flag',author:'Delapouite'};
export const LB_ROOT_ICON:PlanIcon={icon:GiCastle,name:'Castle',author:'Delapouite'};

/** Icons for the upgrades of both War Plans, by upgrade name. */
export const PLAN_ICONS:Readonly<Record<string,PlanIcon>>={
 'Exalted Council':{icon:GiThroneKing,name:'Throne king',author:'Delapouite'},
 'Council Coffers':{icon:GiLockedChest,name:'Locked chest',author:'Lorc'},
 'Forged in Flame':{icon:GiAnvil,name:'Anvil',author:'Lorc'},
 'Flawless Find':{icon:GiGems,name:'Gems',author:'Lorc'},
 'Infernal Hoard':{icon:GiOpenTreasureChest,name:'Open treasure chest',author:'Skoll'},
 'Method and Madness':{icon:GiBrainstorm,name:'Brainstorm',author:'Lorc'},
 'Reign in Hell':{icon:GiSharpCrown,name:'Sharp crown',author:'Lorc'},
 'Impending Doom':{icon:GiSandsOfTime,name:'Sands of time',author:'Lorc'},
 'Total Chaos':{icon:GiVortex,name:'Vortex',author:'Lorc'},
 'Pulse of Aether':{icon:GiPulse,name:'Pulse',author:'Sbed'},
 'Bedlam':{icon:GiUnstableOrb,name:'Unstable orb',author:'Lorc'},
 'The Black Pact':{icon:GiPentacle,name:'Pentacle',author:'Skoll'},
 'Cult of Annihilation':{icon:GiCultist,name:'Cultist',author:'Skoll'},
 'Scale of Tathamet':{icon:GiDragonOrb,name:'Dragon orb',author:'Delapouite'},
 "Devil's Deal":{icon:GiScrollUnfurled,name:'Scroll unfurled',author:'Lorc'},
 'Two by Two':{icon:GiTwoShadows,name:'Two shadows',author:'Lorc'},
 'Greater Nemesis':{icon:GiMagicPortal,name:'Magic portal',author:'Lorc'},
 'Ultimate Nemesis':{icon:GiStarAltar,name:'Star altar',author:'Delapouite'},
 'Nemesis Tides':{icon:GiHighTide,name:'High tide',author:'Delapouite'},
 'Infernal Deception':{icon:GiDevilMask,name:'Devil mask',author:'Delapouite'},
 'Exotic Armory':{icon:GiSpikedArmor,name:'Spiked armor',author:'Lorc'},
 'Dog of Astaroth':{icon:GiHound,name:'Hound',author:'Lorc'},
 'Out of the Cold':{icon:GiFrozenBody,name:'Frozen body',author:'Delapouite'},
 'Blood of Bartuc':{icon:GiBlood,name:'Blood',author:'Skoll'},
 "Varshan's Vengeance":{icon:GiFangedSkull,name:'Fanged skull',author:'Lorc'},
 'Lair of Runes':{icon:GiRuneStone,name:'Rune stone',author:'Lorc'},
 'Lair of Plenty':{icon:GiOpenChest,name:'Open chest',author:'Skoll'},
 'Golden Hoard':{icon:GiGoldStack,name:'Gold stack',author:'Delapouite'},
 "Duriel's Invasion":{icon:GiMaggot,name:'Maggot',author:'Lorc'},
 "Grigoire's Gambit":{icon:GiBlackKnightHelm,name:'Black knight helm',author:'Delapouite'},
 'Embers of Anguish':{icon:GiBurningEmbers,name:'Burning embers',author:'Lorc'},
 'Children of Zir':{icon:GiVampireDracula,name:'Vampire dracula',author:'Delapouite'}
};
