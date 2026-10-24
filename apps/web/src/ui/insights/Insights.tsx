import type {RunRecord} from '../../domain/schema';
import {effectiveEvents} from '../../domain/run';
import {downloadExport} from '../../storage/local';
import {Button,PageHeader} from '../kit';
import type {SyncControls,SyncState} from '../useSync';
import {ResearchNote} from './ResearchNote';
import {RunHistory} from './RunHistory';
import {SyncPanel} from './SyncPanel';
import s from './Insights.module.css';

interface Props{runs:RunRecord[];selectRun:(id:string)=>void;onExport:()=>string;sync:SyncState;syncControls:SyncControls}

const plural=(n:number,one:string,many:string)=><><span className={s.num}>{n}</span> {n===1?one:many}</>;

export function Insights({runs,selectRun,onExport,sync,syncControls}:Props){
 const totalDecisions=runs.reduce((n,r)=>n+effectiveEvents(r).filter(x=>x.type==='offer_chosen').length,0);
 const counted=runs.reduce((n,r)=>n+effectiveEvents(r).filter(x=>(x.type==='wave_observed'||x.type==='aether_observed')&&x.payload.eventCounts&&Object.keys(x.payload.eventCounts).length).length,0);
 return <div className={s.page}>
  <PageHeader title="Insights" lead="Your runs, kept on this device."/>
  <p className={s.summary}>
   {plural(runs.length,'run','runs')}, {plural(totalDecisions,'recorded choice','recorded choices')}, and {plural(counted,'wave with event counts','waves with event counts')}.
  </p>
  <RunHistory runs={runs} selectRun={selectRun}/>
  <div><Button variant="secondary" onClick={()=>downloadExport(onExport())} disabled={runs.length===0}>Export all runs</Button></div>
  <SyncPanel sync={sync} controls={syncControls}/>
  <ResearchNote/>
 </div>;
}
