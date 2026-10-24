import {useId,type Ref} from 'react';
import {Button,Field,Frame,Notice,NumberField} from '../kit';
import s from './EndRunPanel.module.css';

interface Props{
 /** "final" once every offer is recorded; "ending" to confirm stopping early. */
 mode:'final'|'ending';
 totalWaves:number;
 aether:string;
 onAether:(text:string)=>void;
 onFinish:()=>void;onEnd:()=>void;onKeep:()=>void;
 error:string;
 /** The heading takes focus when this panel replaces the offers. */
 headingRef:Ref<HTMLHeadingElement>;
}

export function EndRunPanel({mode,totalWaves,aether,onAether,onFinish,onEnd,onKeep,error,headingRef}:Props){
 const headingId=useId();
 const ending=mode==='ending';
 const body=<div className={s.body}>
  <h2 id={headingId} tabIndex={-1} ref={headingRef} className={s.heading}>{ending?'End this run now?':`All ${totalWaves} offers recorded`}</h2>
  <p className={s.text}>{ending?'Use this if you died, left, or stopped recording. Everything recorded so far is kept.':`Play wave ${totalWaves}, then enter your final Aether.`}</p>
  <Field label="Final Aether (optional)">
   {wire=><NumberField wire={wire} min={0} placeholder="Total shown in game" value={aether} onChange={e=>onAether(e.target.value)}/>}
  </Field>
  <div className={s.actions}>
   {ending?<>
    <Button variant="primary" onClick={onEnd}>End run</Button>
    <Button onClick={onKeep}>Keep recording</Button>
   </>:<Button variant="primary" onClick={onFinish}>Finish run</Button>}
  </div>
  {error&&<Notice tone="error"><p>{error}</p></Notice>}
 </div>;
 return ending?<section aria-labelledby={headingId} className={s.panel}>{body}</section>:<Frame label="Finish run">{body}</Frame>;
}
