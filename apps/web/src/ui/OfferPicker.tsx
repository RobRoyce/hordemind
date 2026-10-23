import {forwardRef,useId,useImperativeHandle,useMemo,useRef,useState} from 'react';
import {resolveOffer,searchOffers,type OfferRef} from '../catalog';

/** `offer` is a catalog label, deliberately kept unlisted text, or null while unresolved. */
export interface Slot{text:string;offer:string|null;unlisted:boolean}
export const emptySlot=():Slot=>({text:'',offer:null,unlisted:false});
export const slotFor=(offer:string):Slot=>{
 const ref=resolveOffer(offer);
 return ref?{text:ref.label,offer:ref.label,unlisted:false}:{text:offer,offer,unlisted:true};
};
export const familyClass=(ref:OfferRef|null)=>'fam fam-'+(ref?.family.split(' ')[0]?.toLowerCase()??'unlisted');

interface Props{
 index:number;slot:Slot;recent:readonly string[];
 onChange:(slot:Slot)=>void;
 /** Called after a pick so the parent can move focus to the next row. */
 onPicked:()=>void;
}
const MAX_SHOWN=8;

export const OfferPicker=forwardRef<HTMLInputElement,Props>(function OfferPicker({index,slot,recent,onChange,onPicked},ref){
 const id=useId(),listId=id+'-list';
 const input=useRef<HTMLInputElement>(null);
 useImperativeHandle(ref,()=>input.current as HTMLInputElement);
 const [open,setOpen]=useState(false);
 const [active,setActive]=useState(0);
 const matches=useMemo(()=>searchOffers(slot.offer?'':slot.text,recent).slice(0,MAX_SHOWN),[slot.text,slot.offer,recent]);
 const ref_=slot.offer&&!slot.unlisted?resolveOffer(slot.offer):null;
 const unresolved=slot.text.trim()!==''&&slot.offer===null;

 function pick(offer:OfferRef){
  onChange({text:offer.label,offer:offer.label,unlisted:false});
  setOpen(false);
  onPicked();
 }
 function edit(text:string){
  const exact=resolveOffer(text);
  // Exact names resolve as typed; anything else stays unresolved until picked.
  const resolved=exact&&exact.label.toLowerCase()===text.trim().toLowerCase();
  onChange(resolved?{text,offer:exact.label,unlisted:false}:{text,offer:null,unlisted:false});
  setActive(0);
  setOpen(!resolved&&document.activeElement===input.current);
 }
 function onKeyDown(e:React.KeyboardEvent<HTMLInputElement>){
  if(e.key==='ArrowDown'){e.preventDefault();if(!open)setOpen(true);else setActive(a=>Math.min(matches.length-1,a+1))}
  else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(0,a-1))}
  else if(e.key==='Enter'&&!e.metaKey&&!e.ctrlKey){
   if(open&&matches[active]){e.preventDefault();pick(matches[active])}
   else if(slot.offer){e.preventDefault();onPicked()}
  }
  else if(e.key==='Escape'&&open){e.preventDefault();setOpen(false)}
 }

 return <div className={'picker'+(open&&matches.length?' open':'')}>
  <input
   ref={input} id={id+'-input'} role="combobox" aria-label={`Offer ${index+1}`}
   aria-expanded={open&&matches.length>0} aria-controls={listId} aria-autocomplete="list"
   aria-activedescendant={open&&matches[active]?`${listId}-${active}`:undefined}
   aria-invalid={unresolved||undefined} aria-describedby={unresolved?id+'-note':undefined}
   autoComplete="off" spellCheck={false} placeholder="Search name or mechanic"
   value={slot.text}
   onChange={e=>edit(e.target.value)} onKeyDown={onKeyDown}
   onFocus={()=>{if(!slot.offer)setOpen(true)}} onBlur={()=>setOpen(false)}
  />
  {ref_&&<span className={familyClass(ref_)}>{ref_.family}</span>}
  {slot.unlisted&&<span className={familyClass(null)}>Unlisted</span>}
  {open&&matches.length>0&&<ul role="listbox" id={listId} className="picker-list" aria-label={`Offerings matching offer ${index+1}`}>
   {matches.map((offer,i)=><li key={offer.id} id={`${listId}-${i}`} role="option" aria-selected={i===active}
    className={i===active?'active':''} onMouseDown={e=>{e.preventDefault();pick(offer)}} onMouseEnter={()=>setActive(i)}>
    <span className="picker-name">{offer.label}</span><span className={familyClass(offer)}>{offer.family}</span>
    <small>{offer.hint}</small>
   </li>)}
  </ul>}
  {unresolved&&!open&&<p className="picker-note" id={id+'-note'}>
   Not a known offering. Pick one from the list, or <button type="button" className="linklike"
    onClick={()=>onChange({text:slot.text,offer:slot.text.trim(),unlisted:true})}>record “{slot.text.trim()}” as unlisted</button>.
  </p>}
 </div>;
});
