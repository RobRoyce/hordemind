import {Children,type ReactNode} from 'react';
import s from './RuledList.module.css';

/** Rows separated by hairlines. Each child becomes one list item. */
export function RuledList({label,children}:{label:string;children:ReactNode}){
 return <ul aria-label={label} className={s.list}>
  {Children.map(children,child=>child==null||child===false?null:<li className={s.row}>{child}</li>)}
 </ul>;
}
