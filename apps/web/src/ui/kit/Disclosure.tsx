import type {ReactNode} from 'react';
import {cx} from './cx';
import s from './Disclosure.module.css';

export function Disclosure({summary,children,open}:{summary:ReactNode;children:ReactNode;open?:boolean}){
 return <details className={s.disclosure} open={open}>
  <summary className={s.summary}>{summary}</summary>
  <div className={s.body}>{children}</div>
 </details>;
}

interface ToggleProps{
 open:boolean;onToggle:()=>void;controls:string;children:ReactNode;
 /** Accessible name when the visible text repeats, as in "Details for The Burning Rain". */
 label?:string;
 className?:string;
}

/** A disclosure trigger whose panel the caller places, so an inline trigger can open a full-width panel below. */
export function DisclosureToggle({open,onToggle,controls,children,label,className}:ToggleProps){
 return <button type="button" className={cx(s.toggle,className)} aria-expanded={open} aria-controls={controls} aria-label={label}
  onClick={onToggle}>{children}</button>;
}
