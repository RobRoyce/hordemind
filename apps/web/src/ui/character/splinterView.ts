import type {CharacterProfile} from '../../domain/schema';
import {SPLINTER_MAX_RANK,type SplinterId} from '../../domain/splinters';

export type BonusState='active'|'unlearned'|'reached'|'locked';

/**
 * Locked means the rank isn't met. Reached means it is met on an inactive splinter.
 * On the active splinter the bonus is active once its node is learned, otherwise unlearned.
 * Terror nodes live in the Infernal Hordes War Plan and Destruction nodes in Lair Bosses.
 */
export function bonusState(p:Pick<CharacterProfile,'activeSplinter'|'splinterRanks'|'warPlanNodes'|'lairBossNodes'>,splinter:SplinterId,rank:number,node:string):BonusState{
 if((p.splinterRanks[splinter]??0)<rank)return 'locked';
 if(p.activeSplinter!==splinter)return 'reached';
 const learned=splinter==='terror'?p.warPlanNodes:splinter==='destruction'?p.lairBossNodes:[];
 return learned.includes(node)?'active':'unlearned';
}

/** Empty means not set (null). Non-numbers return undefined so the caller ignores them. */
export function parseRank(text:string):number|null|undefined{
 if(text.trim()==='')return null;
 const n=Number(text);
 return Number.isFinite(n)?Math.max(0,Math.min(SPLINTER_MAX_RANK,Math.round(n))):undefined;
}
