import type {CharacterProfile} from '../../domain/schema';
import {SPLINTER_MAX_RANK,type SplinterBonus,type SplinterId} from '../../domain/splinters';

export type BonusState='active'|'unlearned'|'locked';

/**
 * Locked means the rank isn't met. Unlearned means the rank is met but the bonus's node
 * isn't learned. Call it only for the active splinter's bonuses.
 */
export function bonusState(p:Pick<CharacterProfile,'splinterRank'|'warPlanNodes'|'lairBossNodes'>,bonus:SplinterBonus):BonusState{
 if((p.splinterRank??0)<bonus.rank)return 'locked';
 if(bonus.learnedIn&&!p[bonus.learnedIn].includes(bonus.node))return 'unlearned';
 return 'active';
}

type Selection=Pick<CharacterProfile,'activeSplinter'|'splinterRank'>;

/** A rank never carries over to a splinter it doesn't belong to. */
export function chooseSplinter(p:Selection,id:SplinterId):Selection{
 return {activeSplinter:id,splinterRank:id===p.activeSplinter?p.splinterRank:null};
}

/** Empty means not set (null). Non-numbers return undefined so the caller ignores them. */
export function parseRank(text:string):number|null|undefined{
 if(text.trim()==='')return null;
 const n=Number(text);
 return Number.isFinite(n)?Math.max(0,Math.min(SPLINTER_MAX_RANK,Math.round(n))):undefined;
}
