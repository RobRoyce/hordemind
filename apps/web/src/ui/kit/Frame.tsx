import type {ReactNode} from 'react';
import s from './Frame.module.css';

/** The carved gold frame. At most one per screen. */
export function Frame({label,children}:{label:string;children:ReactNode}){
 return <section aria-label={label} className={s.frame}>{children}</section>;
}
