import {useState} from 'react';
import {COMPASSES} from '../../catalog';
import {Button,Field,Segmented} from '../kit';
import s from './StartRunBar.module.css';

const WAVE_OPTIONS=COMPASSES.map(([n,name])=>({value:String(n),label:String(n),detail:name.replace(/ compass$/,'')}));

/** Picks a compass and starts a run with it. */
export function StartRunBar({onStart}:{onStart:(waves:number)=>void}){
 const [waves,setWaves]=useState('10');
 return <div className={s.bar}>
  <div className={s.waves}>
   <Field label="Waves" group>
    {w=><Segmented label="Waves" value={waves} options={WAVE_OPTIONS} onChange={setWaves} describedBy={w.describedBy}/>}
   </Field>
  </div>
  <div><Button variant="primary" onClick={()=>onStart(Number(waves))}>Start a {waves}-wave run</Button></div>
 </div>;
}
