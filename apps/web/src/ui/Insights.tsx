import type {RunRecord} from '../domain/schema';
import {effectiveEvents,project} from '../domain/run';
import {downloadExport} from '../storage/local';
import {SyncPanel} from './SyncPanel';
import type {SyncControls,SyncState} from './useSync';

interface Props{runs:RunRecord[];selectRun:(id:string)=>void;onExport:()=>string;sync:SyncState;syncControls:SyncControls}
const STATUS={in_progress:'In progress',completed:'Completed',abandoned:'Ended early'} as const;
export function Insights({runs,selectRun,onExport,sync,syncControls}:Props){
 const totalDecisions=runs.reduce((n,r)=>n+effectiveEvents(r).filter(x=>x.type==='offer_chosen').length,0);
 const counted=runs.reduce((n,r)=>n+effectiveEvents(r).filter(x=>(x.type==='wave_observed'||x.type==='aether_observed')&&x.payload.eventCounts&&Object.keys(x.payload.eventCounts).length).length,0);
 return <div className="content">
  <div className="section-intro"><span className="eyebrow">03 / AFTER PLAY</span><h1>Insights</h1><p>Your own gameplay evidence comes first. Community analytics will follow once opt-in uploads and model-validation safeguards are ready.</p></div>
  <div className="stats-row">
   <div className="stat"><b>{runs.length}</b><span>Local runs</span></div>
   <div className="stat"><b>{totalDecisions}</b><span>Recorded choices</span></div>
   <div className="stat"><b>{counted}</b><span>Event-count observations</span></div>
  </div>
  <section className="surface"><div className="section-header"><div><h2>Run history</h2><p>Reload safely; sessions are stored on this device.</p></div><button className="primary" onClick={()=>downloadExport(onExport())} disabled={runs.length===0}>Export data (JSON)</button></div>
   {runs.length===0?<p className="empty-hint">No runs yet. Start your first session from Live Run.</p>:<div className="session-list">{runs.map(r=>{const p=project(r);return <button className="session" key={r.id} onClick={()=>selectRun(r.id)}>
    <span><strong>{p.profile.name} · {p.profile.className}</strong><small>{p.profile.gamePatch} · {new Date(r.createdAt).toLocaleString()}</small></span>
    <span className="session-right"><b>{p.chosen.length} / {p.totalWaves} choices</b><small>{p.lastTotalAether===null?'Aether not recorded':p.lastTotalAether+' Aether'} · {STATUS[r.status]}</small></span>
   </button>})}</div>}
  </section>
  <SyncPanel sync={sync} controls={syncControls}/>
  <section className="surface"><h2>Community research</h2><div className="notice"><strong>Private by default</strong><p>Nothing is shared for community research yet. Private sync, above, copies data only to your own account and only after you sign in. Contributing to research will be a separate opt-in with a clear deletion and withdrawal policy.</p></div>
   <h3>What would help the model learn?</h3><p>Choice sets, selected options, War Plan nodes, patch number, and cumulative Aether are especially valuable. Optional counts of Mass, Fiend, Hellborne and Spire events provide stronger evidence for trigger probabilities.</p>
   <p className="micro">We must control for selection bias. More users alone doesn't imply that comparisons are causal.</p>
  </section>
 </div>;
}
