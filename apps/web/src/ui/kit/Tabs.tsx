import type {ReactNode} from 'react';
import s from './Tabs.module.css';

interface TabItem{id:string;label:string;detail?:string}
interface Props{
 label:string;
 items:readonly TabItem[];
 current:string|null;
 onSelect:(id:string)=>void;
 /** Extra control after the tabs, such as "New character". */
 trailing?:ReactNode;
}

export function Tabs({label,items,current,onSelect,trailing}:Props){
 return <div role="group" aria-label={label} className={s.tabs}>
  {items.map(item=><button key={item.id} type="button" className={s.tab} aria-pressed={item.id===current} onClick={()=>onSelect(item.id)}>
   {item.label}
   {item.detail&&<span className={s.detail}>{item.detail}</span>}
  </button>)}
  {trailing&&<span className={s.trailing}>{trailing}</span>}
 </div>;
}
