import type {ReactNode,Ref} from 'react';
import {Checkbox,NumberField,type FieldWire} from '../kit';
import s from './AetherInput.module.css';

interface Props{
 wire:FieldWire;value:string;onChange:(text:string)=>void;
 /** A required reading offers Missed it, so a reading the player didn't catch is never guessed. */
 missed:boolean;onMissed?:((missed:boolean)=>void)|undefined;
 inputRef?:Ref<HTMLInputElement>|undefined;
 /** Controls that share the input's row, such as the Event counts toggle. */
 children?:ReactNode;
}

/** An Aether total typed from the game. Its row keeps controls level with the input, so an error line below never shifts them. */
export function AetherInput({wire,value,onChange,missed,onMissed,inputRef,children}:Props){
 return <div className={s.row}>
  <div className={s.input}>
   <NumberField wire={wire} ref={inputRef} min={0} required={Boolean(onMissed)&&!missed} disabled={missed}
    placeholder={missed?'Not read':'Total shown in game'} value={missed?'':value} onChange={e=>onChange(e.target.value)}/>
  </div>
  {onMissed&&<Checkbox label="Missed it" checked={missed} onChange={onMissed}/>}
  {children}
 </div>;
}
