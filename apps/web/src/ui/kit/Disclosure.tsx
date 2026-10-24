import type {ReactNode} from 'react';
import s from './Disclosure.module.css';

export function Disclosure({summary,children,open}:{summary:ReactNode;children:ReactNode;open?:boolean}){
 return <details className={s.disclosure} open={open}>
  <summary className={s.summary}>{summary}</summary>
  <div className={s.body}>{children}</div>
 </details>;
}
