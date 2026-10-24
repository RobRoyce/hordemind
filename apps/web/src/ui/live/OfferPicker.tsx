import {forwardRef,useEffect,useId,useImperativeHandle,useMemo,useRef,useState,type KeyboardEvent,type RefObject} from 'react';
import {resolveOffer,searchOffers,type OfferFamily,type OfferRef} from '../../catalog';
import {CategoryMark,DangerMark,Sheet,cx,useNarrow} from '../kit';
import {RECENT_IN_PICKER,categoryTiles,offersIn} from './pickerModel';
import type {Slot} from './slot';
import s from './OfferPicker.module.css';

const picked=(offer:OfferRef):Slot=>({text:offer.label,offer:offer.label,unlisted:false});
const unlisted=(text:string):Slot=>({text,offer:text.trim(),unlisted:true});

export const pickerTitle=(index:number,total:number)=>`Offer ${index+1} of ${total}`;

/** The active option of a results list, kept in view. */
function useActive(count:number,listId:string,shown:boolean){
 const [active,setActive]=useState(0);
 const current=Math.max(0,Math.min(active,count-1));
 useEffect(()=>{if(shown)document.getElementById(`${listId}-${current}`)?.scrollIntoView({block:'nearest'})},[shown,current,listId]);
 return {active:current,setActive,move:(by:number)=>setActive(Math.max(0,Math.min(count-1,current+by))),reset:()=>setActive(0)};
}

interface ResultsProps{id:string;label:string;matches:OfferRef[];active:number;onActive:(i:number)=>void;onPick:(offer:OfferRef)=>void;className?:string}

function Results({id,label,matches,active,onActive,onPick,className}:ResultsProps){
 return <ul role="listbox" id={id} aria-label={label} className={cx(s.results,className)}>
  {matches.map((offer,i)=><li key={offer.id} id={`${id}-${i}`} role="option" aria-selected={i===active}
   className={cx(s.option,i===active&&s.active)} onMouseDown={e=>{e.preventDefault();onPick(offer)}} onMouseEnter={()=>onActive(i)}>
   <span className={s.optionName}>{offer.label}</span>
   <CategoryMark family={offer.family}/>
   <small>{offer.hint}</small>
  </li>)}
 </ul>;
}

interface StepsProps{
 recent:readonly string[];likely:OfferFamily|null;family:OfferFamily|null;
 onFamily:(family:OfferFamily|null)=>void;onPick:(offer:OfferRef)=>void;
 /** ArrowUp from the first item hands focus back to the search field. */
 onExitTop:()=>void;
}

/** Step 1 lists recent offers and category tiles; step 2 lists one category's offers. */
function Steps({recent,likely,family,onFamily,onPick,onExitTop}:StepsProps){
 const root=useRef<HTMLDivElement>(null);
 const recentId=useId();
 const tiles=useMemo(()=>categoryTiles(likely),[likely]);
 const recentRefs=useMemo(()=>recent.map(resolveOffer).filter((o):o is OfferRef=>o!==null).slice(0,RECENT_IN_PICKER),[recent]);

 // A step change unmounts the focused button. Focus moves to the first offer, or back to the tile it came from.
 const previous=useRef(family);
 useEffect(()=>{
  const came=previous.current;
  previous.current=family;
  const el=root.current,active=document.activeElement;
  if(!el||came===family||(active&&active!==document.body&&!el.contains(active)))return;
  const target=family?el.querySelector<HTMLElement>('[data-offer]'):el.querySelector<HTMLElement>(`[data-family="${came}"]`);
  (target??el.querySelector<HTMLElement>('[data-nav]'))?.focus();
 },[family]);

 function onKeyDown(e:KeyboardEvent<HTMLDivElement>){
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||!root.current)return;
  const items=[...root.current.querySelectorAll<HTMLElement>('[data-nav]')];
  const i=items.indexOf(document.activeElement as HTMLElement);
  if(i<0)return;
  e.preventDefault();
  const sign=e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:1;
  const grid=items[i]!.closest<HTMLElement>('[data-grid]');
  let j=i+sign;
  if(grid&&(e.key==='ArrowUp'||e.key==='ArrowDown')){
   const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
   const start=items.findIndex(x=>grid.contains(x));
   const end=start+grid.querySelectorAll('[data-nav]').length-1;
   j=i+sign*cols;
   // Up from the top row leaves the grid; down from the bottom row stays put.
   if(j<start)j=start-1;
   else if(j>end)j=i;
  }
  if(j<0){onExitTop();return}
  items[Math.min(j,items.length-1)]?.focus();
 }

 if(family)return <div ref={root} className={s.steps} onKeyDown={onKeyDown}>
  <div className={s.stepHead}>
   <button type="button" data-nav className={s.back} onClick={()=>onFamily(null)}><span aria-hidden="true">‹</span> All categories</button>
   <CategoryMark family={family}/>
  </div>
  <ul className={s.list} aria-label={`${family} offers`}>
   {offersIn(family).map(o=><li key={o.id}>
    <button type="button" data-nav data-offer className={s.offer} onClick={()=>onPick(o)}>
     <span className={s.offerName}>{o.label}{o.danger&&<DangerMark danger={o.danger}/>}</span>
     <small>{o.hint}</small>
    </button>
   </li>)}
  </ul>
 </div>;

 return <div ref={root} className={s.steps} onKeyDown={onKeyDown}>
  {recentRefs.length>0&&<div>
   <p className={s.label} id={recentId}>Seen in your recent runs</p>
   <ul className={s.list} aria-labelledby={recentId}>
    {recentRefs.map(o=><li key={o.id}>
     <button type="button" data-nav className={s.recent} onClick={()=>onPick(o)}><span>{o.label}</span><CategoryMark family={o.family}/></button>
    </li>)}
   </ul>
  </div>}
  <div role="group" aria-label="Categories" data-grid className={s.grid}>
   {tiles.map(t=><button key={t.family} type="button" data-nav data-family={t.family} className={cx(s.tile,t.likely&&s.likely)}
    onClick={()=>t.only?onPick(t.only):onFamily(t.family)}>
    <CategoryMark family={t.family}/>
    <small>{t.only?t.only.label:t.likely?`Likely, after ${t.family}`:`${t.count} offers`}</small>
   </button>)}
  </div>
 </div>;
}

interface Props{
 index:number;slot:Slot;recent:readonly string[];likely:OfferFamily|null;
 /** Opens straight at this category's offers. The Black Pact's offer shares the last pick's category. */
 startFamily?:OfferFamily|null;
 total:number;
 /** The picker's heading. Defaults to "Offer K of N". */
 title?:string;
 /** The tap picker is open. Below 700px the parent's `PickerSheet` shows it. */
 open:boolean;
 onOpenChange:(open:boolean)=>void;
 onChange:(slot:Slot)=>void;
 /** Called after a pick so the parent can move to the next empty row. */
 onPicked:()=>void;
}

/**
 * One offer row's field. Typing searches the catalog. Focusing an empty field on a wide
 * screen opens the tap picker under the row; tapping a field on a phone opens `PickerSheet`.
 */
export const OfferPicker=forwardRef<HTMLInputElement,Props>(function OfferPicker(
 {index,slot,recent,likely,startFamily=null,total,title,open,onOpenChange,onChange,onPicked},ref){
 const narrow=useNarrow();
 const id=useId(),listId=id+'-list',noteId=id+'-note';
 const root=useRef<HTMLDivElement>(null);
 const input=useRef<HTMLInputElement>(null);
 useImperativeHandle(ref,()=>input.current as HTMLInputElement);
 const [listOpen,setListOpen]=useState(false);
 const [family,setFamily]=useState<OfferFamily|null>(startFamily);
 const query=slot.offer?'':slot.text.trim();
 const matches=useMemo(()=>query?searchOffers(query,recent):[],[query,recent]);
 const showList=listOpen&&matches.length>0;
 const nav=useActive(matches.length,listId,showList);
 const empty=slot.text.trim()==='';
 const unresolved=!empty&&slot.offer===null;
 const panel=open&&!narrow&&empty;
 const inside=(node:EventTarget|null)=>!!root.current?.contains(node as Node|null);

 useEffect(()=>{if(open)setFamily(startFamily)},[open,startFamily]);

 function pick(next:Slot){
  onChange(next);
  setListOpen(false);
  onPicked();
 }
 function edit(text:string){
  const exact=resolveOffer(text);
  // Exact names resolve as typed; anything else stays unresolved until picked.
  const resolved=exact&&exact.label.toLowerCase()===text.trim().toLowerCase();
  onChange(resolved?{text,offer:exact.label,unlisted:false}:{text,offer:null,unlisted:false});
  nav.reset();
  setListOpen(!resolved&&document.activeElement===input.current);
 }
 function close(){
  onOpenChange(false);
  input.current?.focus();
 }
 function onKeyDown(e:KeyboardEvent<HTMLInputElement>){
  if(e.key==='ArrowDown'){
   e.preventDefault();
   if(showList)nav.move(1);
   else if(panel)root.current?.querySelector<HTMLElement>('[data-nav]')?.focus();
   else if(query)setListOpen(true);
   else onOpenChange(true);
  }
  else if(e.key==='ArrowUp'&&showList){e.preventDefault();nav.move(-1)}
  else if(e.key==='Enter'&&!e.metaKey&&!e.ctrlKey){
   const match=showList?matches[nav.active]:undefined;
   if(match){e.preventDefault();pick(picked(match))}
   else if(slot.offer){e.preventDefault();onPicked()}
   else if(empty&&!open){e.preventDefault();onOpenChange(true)}
  }
  else if(e.key==='Escape'&&(listOpen||open)){
   e.preventDefault();
   setListOpen(false);
   if(open)onOpenChange(false);
  }
  else if(e.key==='Backspace'&&panel&&family&&slot.text===''){e.preventDefault();setFamily(null)}
 }

 return <div ref={root} className={s.picker} onBlur={e=>{
  if(inside(e.relatedTarget))return;
  setListOpen(false);
  if(open&&!narrow)onOpenChange(false);
 }}>
  <input
   ref={input} role="combobox" aria-label={`Offer ${index+1}`}
   aria-expanded={showList} aria-controls={showList?listId:undefined} aria-autocomplete="list"
   aria-activedescendant={showList?`${listId}-${nav.active}`:undefined}
   aria-invalid={unresolved||undefined} aria-describedby={unresolved&&!showList?noteId:undefined}
   autoComplete="off" spellCheck={false} inputMode={narrow?'none':undefined}
   placeholder={narrow?'Tap to choose':'Choose, or type to search'}
   className={cx(s.field,!empty&&!unresolved&&s.filled)}
   value={slot.text}
   onChange={e=>edit(e.target.value)} onKeyDown={onKeyDown}
   onFocus={e=>{if(!narrow&&empty&&!inside(e.relatedTarget))onOpenChange(true)}}
   onClick={()=>{if(narrow||empty)onOpenChange(true)}}
  />
  {showList&&<Results id={listId} label={`Offerings matching offer ${index+1}`} className={s.below}
   matches={matches} active={nav.active} onActive={nav.setActive} onPick={o=>pick(picked(o))}/>}
  {unresolved&&!showList&&<p className={cx(s.note,s.below)} id={noteId}>
   Not a known offering. Pick one from the list, or <button type="button" className={s.linky}
    onClick={()=>onChange(unlisted(slot.text))}>record “{slot.text.trim()}” as unlisted</button>.
  </p>}
  {/* Mouse presses keep focus in the field, so the panel stays open until a pick lands. */}
  {panel&&<div className={s.below} onMouseDown={e=>e.preventDefault()}>
   <Sheet open title={title??pickerTitle(index,total)} onClose={close}>
    <Steps recent={recent} likely={likely} family={family} onFamily={setFamily} onPick={o=>pick(picked(o))} onExitTop={()=>input.current?.focus()}/>
   </Sheet>
  </div>}
 </div>;
});

interface SheetContentProps{
 recent:readonly string[];likely:OfferFamily|null;startFamily?:OfferFamily|null;
 onPick:(slot:Slot)=>void;
}

function SheetContent({rootRef,recent,likely,startFamily=null,onPick}:SheetContentProps&{rootRef:RefObject<HTMLDivElement|null>}){
 const listId=useId()+'-list';
 const search=useRef<HTMLInputElement>(null);
 const [family,setFamily]=useState<OfferFamily|null>(startFamily);
 const [text,setText]=useState('');
 const query=text.trim();
 const matches=useMemo(()=>query?searchOffers(query,recent):[],[query,recent]);
 const nav=useActive(matches.length,listId,matches.length>0);

 // Each row remounts this content while the sheet stays open, so focus restarts here.
 useEffect(()=>{rootRef.current?.focus()},[rootRef]);

 function onKeyDown(e:KeyboardEvent<HTMLInputElement>){
  if(e.key==='ArrowDown'){
   e.preventDefault();
   if(matches.length)nav.move(1);
   else rootRef.current?.querySelector<HTMLElement>('[data-nav]')?.focus();
  }
  else if(e.key==='ArrowUp'&&matches.length){e.preventDefault();nav.move(-1)}
  else if(e.key==='Enter'){
   const match=matches[nav.active];
   if(match){e.preventDefault();onPick(picked(match))}
  }
  else if(e.key==='Backspace'&&text===''&&family){e.preventDefault();setFamily(null)}
 }

 return <div ref={rootRef} tabIndex={-1} className={s.sheetContent}>
  <input
   ref={search} type="search" role="combobox" aria-label="Search offers" placeholder="Type to search…"
   aria-expanded={matches.length>0} aria-controls={matches.length?listId:undefined} aria-autocomplete="list"
   aria-activedescendant={matches.length?`${listId}-${nav.active}`:undefined}
   autoComplete="off" spellCheck={false} enterKeyHint="search" className={s.search}
   value={text} onChange={e=>{setText(e.target.value);nav.reset()}} onKeyDown={onKeyDown}
  />
  {!query?<Steps recent={recent} likely={likely} family={family} onFamily={setFamily} onPick={o=>onPick(picked(o))} onExitTop={()=>search.current?.focus()}/>
   :matches.length?<Results id={listId} label="Matching offers" matches={matches} active={nav.active} onActive={nav.setActive} onPick={o=>onPick(picked(o))}/>
   :<p className={s.note}>No offer matches “{query}”. <button type="button" className={s.linky} onClick={()=>onPick(unlisted(text))}>Record “{query}” as unlisted</button></p>}
 </div>;
}

interface PickerSheetProps extends SheetContentProps{
 /** The row being filled, or null when the sheet is closed. */
 row:number|null;
 title:string;
 onClose:()=>void;
 returnFocus?:RefObject<HTMLElement|null>;
}

/** The tap picker below 700px. One sheet serves every row, so moving to the next row never replays its entrance. */
export function PickerSheet({row,title,onClose,returnFocus,...content}:PickerSheetProps){
 const root=useRef<HTMLDivElement>(null);
 return <Sheet open={row!==null} title={title} onClose={onClose} returnFocus={returnFocus} initialFocus={root}>
  {row!==null&&<SheetContent key={row} rootRef={root} {...content}/>}
 </Sheet>;
}
