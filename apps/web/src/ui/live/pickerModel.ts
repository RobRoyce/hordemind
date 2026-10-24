// Category-first offer entry: which tiles to show, in what order, and which to hint.

import {FAMILY_ORDER,OFFERS,resolveOffer,type OfferFamily,type OfferRef} from '../../catalog';

export interface CategoryTile{
 family:OfferFamily;
 count:number;
 /** The category's only offer, which one tap records. */
 only:OfferRef|null;
 likely:boolean;
}

/** Recent offers shown above the category grid. */
export const RECENT_IN_PICKER=4;

/** Most offers first, ties in browsing order. Computed from the catalog, never from history. */
export function categoryTiles(likely:OfferFamily|null):CategoryTile[]{
 return FAMILY_ORDER.map(family=>{
  const offers=offersIn(family);
  return {family,count:offers.length,only:offers.length===1?offers[0]!:null,likely:family===likely};
 }).filter(t=>t.count>0).sort((a,b)=>b.count-a.count||FAMILY_ORDER.indexOf(a.family)-FAMILY_ORDER.indexOf(b.family));
}

export function offersIn(family:OfferFamily):OfferRef[]{
 return OFFERS.filter(o=>o.family===family).sort((a,b)=>a.label.localeCompare(b.label));
}

/** With Method and Madness learned, the next offer tends to share the last pick's category. */
export function likelyFamily(warPlanNodes:readonly string[],lastPick:string|null):OfferFamily|null{
 if(!warPlanNodes.includes('Method and Madness')||!lastPick)return null;
 return resolveOffer(lastPick)?.family??null;
}

/** The Black Pact's offer shares the last pick's category. */
export function pactFamily(lastPick:string|null):OfferFamily|null{
 return lastPick?resolveOffer(lastPick)?.family??null:null;
}
