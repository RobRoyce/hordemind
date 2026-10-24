import type {RunRecord} from '../../domain/schema';
import {project} from '../../domain/run';
import {RuledList} from '../kit';
import s from './RunHistory.module.css';

const OUTCOME={completed:'completed',abandoned:'ended early'} as const;
/** Month, day and time, with the year only when it isn't this year. */
export function runDate(iso:string){
 const d=new Date(iso);
 const year=d.getFullYear()===new Date().getFullYear()?{}:{year:'numeric'} as const;
 return d.toLocaleString(undefined,{month:'short',day:'numeric',...year,hour:'numeric',minute:'2-digit'});
}

/** Every run, newest as stored. Choosing one opens it in Live Run. */
export function RunHistory({runs,selectRun}:{runs:RunRecord[];selectRun:(id:string)=>void}){
 if(runs.length===0)return <p className={s.empty}>No runs yet. Start your first run from Live Run.</p>;
 return <RuledList label="Run history">
  {runs.map(r=>{
   const p=project(r);
   const waves=`${p.chosen.length} of ${p.totalWaves} waves`;
   return <button key={r.id} type="button" className={s.run} onClick={()=>selectRun(r.id)}>
    <span className={s.side}>
     <span className={s.title}>{p.profile.name}, {p.profile.className}</span>
     <span className={s.meta}>{runDate(r.createdAt)}, {p.profile.realm}, {p.profile.difficulty==='Unknown'?'difficulty not set':p.profile.difficulty}</span>
    </span>
    <span className={s.end}>
     {r.status==='in_progress'?<span className={s.progress}>In progress</span>
      :p.lastTotalAether===null?<span className={s.meta}>Aether not recorded</span>
      :<span className={s.aether}>{p.lastTotalAether} Aether</span>}
     <span className={s.meta}>{r.status==='in_progress'?waves:`${waves}, ${OUTCOME[r.status]}`}</span>
    </span>
   </button>;
  })}
 </RuledList>;
}
