import {useId,useState,type ComponentProps,type ReactNode} from 'react';
import {cx} from './cx';
import s from './Field.module.css';

/** What a control needs to join its Field's label, hint and error. */
export interface FieldWire{id:string;describedBy?:string;invalid:boolean}

interface FieldProps{
 label:string;
 /** Tip shown inline under the label when the help toggle opens it. */
 help?:string;
 hint?:string;
 error?:string;
 children:(wire:FieldWire)=>ReactNode;
}

export function Field({label,help,hint,error,children}:FieldProps){
 const id=useId();
 const [open,setOpen]=useState(false);
 const tipId=id+'-tip';
 const hintId=hint?id+'-hint':undefined;
 const errorId=error?id+'-error':undefined;
 const describedBy=[hintId,errorId].filter(Boolean).join(' ')||undefined;
 return <div className={s.field}>
  <div className={s.labelRow}>
   <label htmlFor={id} className={s.label}>{label}</label>
   {help&&<button type="button" className={s.helpToggle} aria-label={`Help: ${label}`}
    aria-expanded={open} aria-controls={tipId} onClick={()=>setOpen(o=>!o)}>
    <span className={s.diamond} aria-hidden="true">?</span>
   </button>}
  </div>
  {help&&<p id={tipId} className={s.tip} hidden={!open}>{help}</p>}
  {children({id,describedBy,invalid:Boolean(error)})}
  {hint&&<p id={hintId} className={s.hint}>{hint}</p>}
  {error&&<p id={errorId} className={s.error}>{error}</p>}
 </div>;
}

type Wired<P>=P&{wire:FieldWire};

function wired({wire,className}:{wire:FieldWire;className?:string|undefined},base:string|undefined){
 return {id:wire.id,'aria-describedby':wire.describedBy,'aria-invalid':wire.invalid||undefined,className:cx(base,className)};
}

export function TextField({wire,className,...rest}:Wired<ComponentProps<'input'>>){
 return <input type="text" {...rest} {...wired({wire,className},s.input)}/>;
}

export function NumberField({wire,className,...rest}:Wired<ComponentProps<'input'>>){
 return <input type="number" inputMode="numeric" {...rest} {...wired({wire,className},s.input)}/>;
}

export function Select({wire,className,children,...rest}:Wired<ComponentProps<'select'>>){
 return <span className={s.selectWrap}>
  <select {...rest} {...wired({wire,className},s.select)}>{children}</select>
 </span>;
}

export function Checkbox({label,checked,onChange}:{label:string;checked:boolean;onChange:(checked:boolean)=>void}){
 return <label className={s.checkbox}>
  <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
  <span>{label}</span>
 </label>;
}
