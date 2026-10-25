import type {ReactNode} from 'react';
import s from './Disclosure.module.css';

export function Disclosure({summary,children,open}:{summary:ReactNode;children:ReactNode;open?:boolean}){
 return <details className={s.disclosure} open={open}>
  <summary className={s.summary}>{summary}</summary>
  <div className={s.body}>{children}</div>
 </details>;
}

interface ToggleProps{open:boolean;onToggle:()=>void;controls:string;children:ReactNode}

/** A disclosure trigger whose panel the caller places, so an inline trigger can open a full-width panel below. */
export function DisclosureToggle({open,onToggle,controls,children}:ToggleProps){
 return <button type="button" className={s.toggle} aria-expanded={open} aria-controls={controls} onClick={onToggle}>{children}</button>;
}
