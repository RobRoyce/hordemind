import {resolveOffer} from '../../catalog';

/** `offer` is a catalog label, deliberately kept unlisted text, or null while unresolved. */
export interface Slot{text:string;offer:string|null;unlisted:boolean}
export const emptySlot=():Slot=>({text:'',offer:null,unlisted:false});
export const slotFor=(offer:string):Slot=>{
 const ref=resolveOffer(offer);
 return ref?{text:ref.label,offer:ref.label,unlisted:false}:{text:offer,offer,unlisted:true};
};
