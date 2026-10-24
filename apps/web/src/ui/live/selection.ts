// Which offer row is selected for recording, and whether the player chose it.

export interface Selection{slot:number|null;source:'default'|'picked'|null}

export const NO_SELECTION:Selection={slot:null,source:null};

export function pick(slot:number):Selection{return {slot,source:'picked'}}

/**
 * Keeps a player's pick while its row is filled. Otherwise the fresh best is the default,
 * and a stale or missing result selects nothing.
 */
export function reconcile(sel:Selection,ctx:{filled:readonly boolean[];bestSlot:number|null;fresh:boolean}):Selection{
 if(sel.source==='picked'&&sel.slot!==null&&ctx.filled[sel.slot])return sel;
 if(ctx.fresh&&ctx.bestSlot!==null)return {slot:ctx.bestSlot,source:'default'};
 return NO_SELECTION;
}
