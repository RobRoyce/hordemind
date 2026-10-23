import {useEffect,useMemo,useState} from 'react';
import type {CharacterProfile,RunRecord} from '../domain/schema';
import {append,project,recordDecision,undoChoice} from '../domain/run';
import {OFFERS} from '../catalog';
import {OfferRecommendations} from './OfferRecommendations';
import type {Comparison} from '../recommendation/model';

interface Props{run:RunRecord|null;profile:CharacterProfile|null;saveRun:(r:RunRecord)=>void;onStart:(p:CharacterProfile,waves:number)=>void;onGoStrategy:()=>void}
type CountKey='mass'|'fiend'|'hellborne'|'lord'|'spire';
const OBSERVABLES:[CountKey,string][]=[['mass','Masses killed'],['fiend','Fiends killed'],['hellborne','Hellborne killed'],['lord','Lords killed'],['spire','Spires completed']];
export function LiveRun({run,profile,saveRun,onStart,onGoStrategy}:Props){
 const [offered,setOffered]=useState<string[]>(['','','']);
 const [specialSlotIndex,setSpecialSlotIndex]=useState<number|null>(null);
 const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
 const [aether,setAether]=useState('');
 const [counts,setCounts]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const [recommendations,setRecommendations]=useState<Comparison|null>(null);
 const [recommenderError,setRecommenderError]=useState('');
 const [recommenderBusy,setRecommenderBusy]=useState(false);
 const [waves,setWaves]=useState(10);
 const p=useMemo(()=>run?project(run):null,[run]);
 useEffect(()=>{setOffered(['','','']);setSelectedIndex(null);setAether('');setCounts({});setError('');setSpecialSlotIndex(null)},[run?.id]);
 function commit(){
  if(!run||!p)return;
  try{
   const entries=offered.map(x=>x.trim());
   const options=entries.filter(Boolean);
   if(options.length<2||options.length>4||entries.slice(0,options.length).some(x=>!x))throw Error('Record 2–4 filled offers without empty gaps.');
   if(selectedIndex===null||!options[selectedIndex])throw Error('Select one of the displayed options.');
   if(specialSlotIndex!==null&&!p.specialRemaining)throw Error('The one-time special choice has already been consumed.');
   if(specialSlotIndex!==null&&!options[specialSlotIndex])throw Error('Specify which filled offer is the special option.');
   const next=recordDecision(run,options,selectedIndex,specialSlotIndex);
   saveRun(next);setError('');setSelectedIndex(null);setOffered(['','','']);setSpecialSlotIndex(null);
  }catch(e){setError(String(e instanceof Error?e.message:e))}
 }
 function recordWave(skip:boolean){
  if(!run||!p)return;
  const last=p.chosen.at(-1);if(!last)return;
  try{
   const numeric=skip||aether.trim()===''?null:Number(aether);
   if(numeric!==null&&(!Number.isInteger(numeric)||numeric<0))throw Error('Aether must be a nonnegative whole number.');
   const eventCounts=Object.fromEntries(Object.entries(counts).filter(([,val])=>val.trim()!=='').map(([key,val])=>[key,Number(val)]));
   if(Object.values(eventCounts).some(v=>!Number.isInteger(v)||v<0))throw Error('Event counts must be whole numbers >= 0.');
   const next=append(run,'wave_observed',{wave:last.payload.wave,totalAether:numeric,...(!skip&&Object.keys(eventCounts).length?{eventCounts}:{})});
   saveRun(next);setError('');setAether('');setCounts({});
  }catch(e){setError(String(e instanceof Error?e.message:e))}
 }
 function finish(){
  if(!run||!p)return;
  try{saveRun(append(run,'run_finished',{outcome:'completed',finalAether:p.lastTotalAether}));setError('')}
  catch(e){setError(String(e))}
 }
 function undo(){
  if(!run)return;
  try{saveRun(undoChoice(run));setError('')}catch(e){setError(String(e))}
 }
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   if(!run||!p||p.awaitingObservation||p.nextWave>p.totalWaves||run.status!=='in_progress')return;
   const tag=(event.target as HTMLElement)?.tagName;
   if(['INPUT','TEXTAREA','SELECT'].includes(tag)||event.metaKey||event.ctrlKey||event.altKey)return;
   const idx=Number(event.key)-1;
   if(idx>=0&&idx<offered.length&&offered[idx]?.trim()){setSelectedIndex(idx);event.preventDefault()}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[offered,run,p]);
 const suggestionInputs=offered.map(x=>x.trim()).filter(Boolean);
 useEffect(()=>{
  // Never block keyboard interaction with the simulation. Cancel stale workers when options change.
  if(!run||!p||p.awaitingObservation||run.status!=='in_progress'||suggestionInputs.length<2){
    setRecommendations(null);setRecommenderError('');setRecommenderBusy(false);return;
  }
  const inputs=suggestionInputs;
  let worker:Worker|null=null;
  let disposed=false;
  setRecommenderBusy(true);setRecommendations(null);setRecommenderError('');
  const timer=window.setTimeout(()=>{
    try{
      worker=new Worker(new URL('../recommendation/worker.ts',import.meta.url),{type:'module'});
      worker.onmessage=(event:MessageEvent<{result?:Comparison,error?:string}>)=>{
        if(disposed)return;
        if(event.data.error){setRecommenderError(event.data.error);setRecommendations(null)}
        else setRecommendations(event.data.result??null);
        setRecommenderBusy(false);worker?.terminate();
      };
      worker.onerror=(event)=>{if(!disposed){setRecommenderError(event.message||'Simulation failed');setRecommenderBusy(false)}worker?.terminate()};
      worker.postMessage({requestId:Date.now(),run,offered:inputs,samples:400});
    }catch(e){setRecommenderBusy(false);setRecommenderError(String(e instanceof Error?e.message:e))}
  },220);
  return ()=>{disposed=true;window.clearTimeout(timer);worker?.terminate()};
 },[run,p?.awaitingObservation,offered.join('|')]);
 if(!run||!p)return <div className="content"><div className="section-intro"><span className="eyebrow">02 / DURING PLAY</span><h1>Live Run</h1><p>Keep your attention on the game. Create a character profile once, then use this compact recorder.</p></div><section className="surface empty-state"><div className="empty-icon">▶</div><h2>Start a run</h2>{!profile?<><p>No character profile is selected yet.</p><button className="primary" onClick={onGoStrategy}>Configure character →</button></>:<><p>Ready with <b>{profile.name}</b> · {profile.className} · {profile.realm} · {profile.difficulty}</p><p className="setup-overview"><strong>Saved configuration:</strong> {profile.buildName||'Unspecified build'} · Clear speed: {profile.killSpeed} · Mobility: {profile.mobility} · War Plan nodes: {profile.warPlanNodes.length?profile.warPlanNodes.join(', '):'None selected'} · Special offer: {profile.specialOfferingAvailable?'Configured':'Not configured'}</p><button onClick={onGoStrategy}>Edit saved character configuration</button><label>Waves <select value={waves} onChange={e=>setWaves(+e.target.value)}>{[6,8,10].map(n=><option key={n}>{n}</option>)}</select></label><button className="primary" onClick={()=>onStart(profile,waves)}>Start a {waves}-wave run →</button></>}</section></div>;
 const complete=run.status!=='in_progress';
 const phase=complete?'Finished':p.awaitingObservation?'Record wave result':p.nextWave>p.totalWaves?'Finish run':'Choose an offering';
 return <div className="content runcontent">
  <div className="section-intro compact-intro"><span className="eyebrow">LIVE SESSION · {p.profile.className.toUpperCase()}</span><div className="heading-inline"><h1>{phase}</h1><div className="counter"><b>{p.lastTotalAether===null?'—':p.lastTotalAether}</b><small>Aether so far</small></div></div><p>{p.profile.name} · {p.profile.realm} · {p.profile.difficulty} · {p.profile.buildName||'Unspecified build'}</p><details className="run-profile-summary"><summary>Character & War Plan configuration</summary><p>Clear speed: {p.profile.killSpeed} · Mobility: {p.profile.mobility} · Special offering at start: {p.profile.specialOfferingAvailable?'Yes':'No'}</p><p>War Plans: {p.profile.warPlanNodes.length?p.profile.warPlanNodes.join(', '):'None selected'}</p>{p.profile.buildUrl&&<p><a href={p.profile.buildUrl} target="_blank" rel="noreferrer">Open saved build reference ↗</a></p>}<p className="micro">This is the snapshot saved when the run began. Editing your current character does not alter historical run data.</p><button onClick={onGoStrategy}>View/Edit character profile</button></details></div>
  <div className="runbar"><b>After wave {Math.min(p.nextWave,p.totalWaves)} / {p.totalWaves}</b><span>{p.specialRemaining?'◇ Bonus choice unused':'◆ Bonus choice spent / unavailable'}</span></div>
  <div className="progress-track"><div style={{width:Math.min(100,p.chosen.length/p.totalWaves*100)+'%'}}/></div>
  {p.chosen.length>0&&<div className="stack"><span>Selected so far</span>{p.chosen.map((x,i)=><span key={x.id} className="chip" title={'After wave '+(i+1)}>{x.payload.chosen}</span>)}</div>}
  {complete?<section className="surface empty-state"><h2>Run recorded</h2><p>Return to Insights to review and export this session. Its events remain on this device until you explicitly opt in to future syncing.</p></section>:
   p.awaitingObservation?<section className="surface">
    <span className="eyebrow">OPTIONAL · AFTER THE WAVE</span><h2>Record outcome</h2><p>You chose <b>{p.chosen.at(-1)?.payload.chosen}</b>. Enter cumulative Aether if convenient, or skip. Missing counts remain unknown, not zero.</p>
    <label className="highlight-field">Cumulative Aether<input type="number" min="0" inputMode="numeric" placeholder="Optional, e.g. 357" value={aether} onChange={e=>setAether(e.target.value)}/></label>
    <details className="secondary-details"><summary>Optional event counts for research</summary><div className="form-grid">{OBSERVABLES.map(([id,label])=><label key={id}>{label}<input type="number" min="0" inputMode="numeric" placeholder="Unknown" value={counts[id]||''} onChange={e=>setCounts(x=>({...x,[id]:e.target.value}))}/></label>)}</div><p className="micro">Counting every event isn't necessary. These counts can later help infer mechanisms directly.</p></details>
    <div className="actions"><button className="primary" onClick={()=>recordWave(false)}>Save & next →</button><button onClick={()=>recordWave(true)}>Skip observation</button></div>
   </section>:
   p.nextWave>p.totalWaves?<section className="surface empty-state"><h2>All wave decisions recorded</h2><p>{p.chosen.length} offers selected. Final Aether: {p.lastTotalAether??'Not recorded'}.</p><button className="primary" onClick={finish}>Finish session</button></section>:
   <section className="surface">
    <div className="section-header"><div><h2>What appeared on your screen?</h2><p>Search by name. Pick the actual offering displayed, including a bonus slot when available.</p></div><span className="chip">{p.nextWave} / {p.totalWaves}</span></div>
    <datalist id="offers-reference">{OFFERS.map(x=><option key={x.id} value={x.label}/>)}</datalist>
    <div className="offer-fields">{offered.map((val,i)=>{const info=OFFERS.find(x=>x.label===val.trim());return <div key={i} className={'offer-entry '+(selectedIndex===i?'picked':'')}><button className="offer-number" title={'Select offer '+(i+1)} onClick={()=>setSelectedIndex(i)} disabled={!val.trim()}>{i+1}</button><label><span>Offer {i+1}{specialSlotIndex===i?' · special':''}</span><input list="offers-reference" autoComplete="off" value={val} onChange={e=>{setOffered(arr=>arr.map((x,j)=>j===i?e.target.value:x));if(selectedIndex===i)setSelectedIndex(null)}} placeholder="Type offering name…"/></label><button className="pick-button" disabled={!val.trim()} onClick={()=>setSelectedIndex(i)} aria-pressed={selectedIndex===i}>{selectedIndex===i?'✓ Selected':'Select'}</button>{info&&<small className="offer-hint">{info.hint}</small>}</div>})}</div>
    <div className="actions"><button onClick={()=>{setOffered(x=>x.length===3?[...x,'']:x.slice(0,3));setSpecialSlotIndex(null);setSelectedIndex(null)}}>{offered.length===3?'+ Fourth offer':'Remove fourth slot'}</button>
    {p.specialRemaining&&<label className="special-selector">Which slot is the one-time special offer?<select value={specialSlotIndex===null?'':specialSlotIndex} onChange={e=>setSpecialSlotIndex(e.target.value===''?null:Number(e.target.value))}><option value="">No special offer shown</option>{offered.map((_,i)=><option key={i} value={i}>Offer {i+1}</option>)}</select></label>}</div>
    {specialSlotIndex!==null&&<p className="micro">The special resource is only consumed if you choose that marked offer. Picking another slot preserves it.</p>}
    <OfferRecommendations result={recommendations} loading={recommenderBusy} error={recommenderError} offered={offered} specialSlotIndex={specialSlotIndex} remainingWaves={Math.max(0,p.totalWaves-p.nextWave)} onSelect={setSelectedIndex}/>
    <div className="decision-footer"><div><b>Decision recorder</b><p className="micro">Select your choice above or override the recommendation. Every available option is saved for future mechanics research.</p></div><button className="primary" disabled={selectedIndex===null} onClick={commit}>Record chosen offer →</button></div>
    <p className="micro">Tip: when not typing, press 1–4 to select a filled offer row.</p>
   </section>}
  <div className="actions postrun"><button onClick={undo} disabled={p.chosen.length===0||complete}>Undo last decision</button><span className="micro">Every change is saved locally as a separate journal event.</span></div>
  {error&&<p className="error-msg" role="alert">{error}</p>}
 </div>;
}
