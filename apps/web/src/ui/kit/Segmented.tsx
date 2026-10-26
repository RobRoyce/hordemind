import {useRef,type KeyboardEvent} from 'react';
import {cx} from './cx';
import s from './Segmented.module.css';

interface Props<T extends string>{
 label:string;
 value:T;
 /** A detail sits small under the label, as in "10" over "Legendary". */
 options:readonly {value:T;label:string;detail?:string}[];
 onChange:(value:T)=>void;
 /** Id of a hint that describes the group. */
 describedBy?:string|undefined;
}

/** A radio group drawn as joined segments. Arrow keys move and select; Home and End jump. */
export function Segmented<T extends string>({label,value,options,onChange,describedBy}:Props<T>){
 const refs=useRef<(HTMLButtonElement|null)[]>([]);
 const checked=options.findIndex(o=>o.value===value);
 const tabStop=checked>=0?checked:0;

 function onKeyDown(e:KeyboardEvent,i:number){
  const last=options.length-1;
  const to=e.key==='ArrowRight'||e.key==='ArrowDown'?(i===last?0:i+1)
   :e.key==='ArrowLeft'||e.key==='ArrowUp'?(i===0?last:i-1)
   :e.key==='Home'?0:e.key==='End'?last:null;
  const option=to===null?undefined:options[to];
  if(to===null||!option)return;
  e.preventDefault();
  onChange(option.value);
  refs.current[to]?.focus();
 }

 return <div role="radiogroup" aria-label={label} aria-describedby={describedBy} className={cx(s.group,options.some(o=>o.detail)&&s.tall)}>
  {options.map((o,i)=><button key={o.value} ref={el=>{refs.current[i]=el}} type="button" role="radio"
   aria-checked={o.value===value} tabIndex={i===tabStop?0:-1} className={s.option}
   onClick={()=>onChange(o.value)} onKeyDown={e=>onKeyDown(e,i)}>
   {o.label}{o.detail&&<>{' '}<small className={s.detail}>{o.detail}</small></>}
  </button>)}
 </div>;
}
