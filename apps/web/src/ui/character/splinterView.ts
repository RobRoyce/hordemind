import type {CharacterProfile} from '../../domain/schema';
import {SPLINTER_MAX_RANK,type SplinterId} from '../../domain/splinters';

export type BonusState='active'|'reached'|'locked';

/** Active needs the splinter to be active and the rank reached. Reached means the rank is met on an inactive splinter. */
export function bonusState(p:Pick<CharacterProfile,'activeSplinter'|'splinterRanks'>,splinter:SplinterId,rank:number):BonusState{
 if((p.splinterRanks[splinter]??0)<rank)return 'locked';
 return p.activeSplinter===splinter?'active':'reached';
}

/** Empty means not set (null). Non-numbers return undefined so the caller ignores them. */
export function parseRank(text:string):number|null|undefined{
 if(text.trim()==='')return null;
 const n=Number(text);
 return Number.isFinite(n)?Math.max(0,Math.min(SPLINTER_MAX_RANK,Math.round(n))):undefined;
}
