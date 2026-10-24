import {cx} from './cx';
import s from './WaveTrack.module.css';

interface Props{
 total:number;
 /** Offers taken so far, in wave order. */
 taken:readonly string[];
 /** True while the next wave's offer is being chosen. */
 deciding:boolean;
}

export function WaveTrack({total,taken,deciding}:Props){
 return <ol aria-label="Wave decisions" className={s.track}>
  {Array.from({length:total},(_,i)=>{
   const offer=taken[i];
   const state=offer?'done':i===taken.length&&deciding?'current':'todo';
   const text=offer?`Wave ${i+1}: ${offer}`:`Wave ${i+1}: ${state==='current'?'deciding now':'not yet'}`;
   return <li key={i} className={cx(s.wave,s[state])} title={offer?text:`Wave ${i+1}`}>
    <span className="hm-visually-hidden">{text}</span>
   </li>;
  })}
 </ol>;
}
