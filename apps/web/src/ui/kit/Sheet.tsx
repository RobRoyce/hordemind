import {useEffect,useRef,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Button} from './Button';
import {useNarrow} from './useNarrow';
import s from './Sheet.module.css';

interface Props{
 open:boolean;
 title:string;
 onClose:()=>void;
 children:ReactNode;
 /** Receives focus when the sheet closes. */
 returnFocus?:RefObject<HTMLElement|null>;
}

const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const focusables=(root:HTMLElement)=>[...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el=>el.getClientRects().length>0);

/**
 * Below 700px, a modal bottom sheet that traps focus. Wider, an inline panel.
 * Escape closes both.
 */
export function Sheet({open,title,onClose,children,returnFocus}:Props){
 const narrow=useNarrow();
 const panel=useRef<HTMLDivElement>(null);
 const body=useRef<HTMLDivElement>(null);
 const wasOpen=useRef(false);

 useEffect(()=>{
  if(open&&!wasOpen.current&&narrow){
   const first=body.current&&focusables(body.current)[0];
   (first??panel.current)?.focus();
  }
  if(!open&&wasOpen.current)returnFocus?.current?.focus();
  wasOpen.current=open;
 },[open,narrow,returnFocus]);

 useEffect(()=>{
  if(!open||!narrow)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return ()=>{document.body.style.overflow=previous};
 },[open,narrow]);

 if(!open)return null;

 function onKeyDown(e:KeyboardEvent<HTMLDivElement>){
  if(e.key==='Escape'){
   e.stopPropagation();
   onClose();
   return;
  }
  if(e.key!=='Tab'||!narrow||!panel.current)return;
  const items=focusables(panel.current);
  const first=items[0],last=items.at(-1);
  if(!first||!last)return;
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }

 const head=<div className={s.head}>
  <span className={s.title}>{title}</span>
  <Button variant="text" onClick={onClose}>Close</Button>
 </div>;

 if(!narrow)return <div ref={panel} role="group" aria-label={title} className={s.inline} onKeyDown={onKeyDown}>
  {head}
  <div ref={body}>{children}</div>
 </div>;

 return createPortal(<div className={s.layer}>
  <div className={s.backdrop} onClick={onClose}/>
  <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={s.sheet} onKeyDown={onKeyDown}>
   {head}
   <div ref={body} className={s.body}>{children}</div>
  </div>
 </div>,document.body);
}
