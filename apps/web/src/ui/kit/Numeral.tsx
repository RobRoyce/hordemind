import {cx} from './cx';
import s from './Numeral.module.css';

interface Props{
 label:string;
 value:number|string|null;
 /** Total, shown as "of N". */
 of?:number;
 note?:string;
 tone?:'plain'|'ember';
}

/** A blackletter number with its label. Missing values show a dash. */
export function Numeral({label,value,of,note,tone='plain'}:Props){
 return <div className={cx(s.numeral,tone==='ember'&&s.ember)}>
  <span className={s.line}>
   <span className={s.label}>{label}</span>
   {value===null
    ?<><span className={cx(s.value,s.missing)} aria-hidden="true">—</span><span className="hm-visually-hidden">not known yet</span></>
    :<span className={s.value}>{value}</span>}
   {of!==undefined&&<span className={s.of}>of {of}</span>}
  </span>
  {note&&<span className={s.note}>{note}</span>}
 </div>;
}
