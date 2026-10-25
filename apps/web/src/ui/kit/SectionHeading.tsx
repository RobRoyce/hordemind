import type {ReactNode} from 'react';
import s from './SectionHeading.module.css';

export function SectionHeading({children,level=2,aside,id}:{children:ReactNode;level?:2|3;aside?:ReactNode;id?:string}){
 const H=level===2?'h2':'h3';
 return <div className={s.row}>
  <H id={id} className={s.heading}>{children}</H>
  {aside&&<div className={s.aside}>{aside}</div>}
 </div>;
}
