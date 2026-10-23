import {useEffect,useMemo,useState} from 'react';
import type {CharacterProfile,RunRecord} from '../domain/schema';
import {append,project,recordDecision,undoChoice} from '../domain/run';
import {OFFERS} from '../catalog';

interface Props{run:RunRecord|null;profile:CharacterProfile|null;saveRun:(r:RunRecord)=>void;onStart:(p:CharacterProfile,waves:number)=>void;onGoStrategy:()=>void}
type CountKey='mass'|'fiend'|'hellborne'|'lord'|'spire';
const OBSERVABLES:[CountKey,string][]=[['mass','Masses killed'],['fiend','Fiends killed'],['hellborne','Hellborne killed'],['lord','Lords killed'],['spire','Spires completed']];
export function LiveRun({run,profile,saveRun,onStart,onGoStrategy}:Props){
 const [offered,setOffered]=useState<string[]>(['','','']);
 const [specialSlot,setSpecialSlot]=useState(false);
 const [selected,setSelected]=useState('');
 const [aether,setAether]=useState('');
 const [counts,setCounts]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const [waves,setWaves]=useState(10);
 const p=useMemo(()=>run?project(run):null,[run]);
 useEffect(()=>{setOffered(['','','']);setSelected('');setAether('');setCounts({});setError('');setSpecialSlot(false)},[run?.id]);
 function commit(){
  if(!run||!p)return;
  try{
   const options=offered.map(x=>x.trim()).filter(Boolean);
   if(options.length<2||options.length>4)throw Error('Record 2–4 offers exactly as shown in game.');
   if(!options.includes(selected))throw Error('Select one of the displayed options.');
   if(specialSlot&&!p.specialRemaining)throw Error('The one-time special choice has already been consumed.');
   const next=recordDecision(run,options,selected,specialSlot);
   saveRun(next);setError('');setSelected('');setOffered(['','','']);setSpecialSlot(false);
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
   if(idx>=0&&idx<offered.length&&offered[idx]?.trim()){setSelected(offered[idx]);event.preventDefault()}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[offered,run,p]);
 if(!run||!p)return <div className="content"><div className="section-intro"><span className="eyebrow">02 / DURING PLAY</span><h1>Live Run</h1><p>Keep your attention on the game. Create a character profile once, then use this compact recorder.</p></div><section className="surface empty-state"><div className="empty-icon">▶</div><h2>Start a run</h2>{!profile?<><p>No character profile is selected yet.</p><button className="primary" onClick={onGoStrategy}>Configure character →</button></>:<><p>Ready with <b>{profile.name}</b> · {profile.className} · {profile.difficulty}</p><label>Waves <select value={waves} onChange={e=>setWaves(+e.target.value)}>{[6,8,10].map(n=><option key={n}>{n}</option>)}</select></label><button className="primary" onClick={()=>onStart(profile,waves)}>Start a {waves}-wave run →</button></>}</section></div>;
 const complete=run.status!=='in_progress';
 const phase=complete?'Finished':p.awaitingObservation?'Record wave result':p.nextWave>p.totalWaves?'Finish run':'Choose an offering';
 return <div className="content runcontent">
  <div className="section-intro compact-intro"><span className="eyebrow">LIVE SESSION · {p.profile.className.toUpperCase()}</span><div className="heading-inline"><h1>{phase}</h1><div className="counter"><b>{p.lastTotalAether===null?'—':p.lastTotalAether}</b><small>Aether so far</small></div></div><p>{p.profile.name} · {p.profile.difficulty} · {p.profile.buildName||'Unspecified build'}</p></div>
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
    <div className="offer-fields">{offered.map((val,i)=>{const info=OFFERS.find(x=>x.label===val.trim());return <div key={i} className={'offer-entry '+(selected===val&&val.trim()?'picked':'')}><button className="offer-number" title={'Select offer '+(i+1)} onClick={()=>setSelected(val)} disabled={!val.trim()}>{i+1}</button><label><span>Offer {i+1}{i===3?' · extra':''}</span><input list="offers-reference" autoComplete="off" value={val} onChange={e=>{setOffered(arr=>arr.map((x,j)=>j===i?e.target.value:x));setSelected(x=>x===val?'':x)}} placeholder="Type offering name…"/></label><button className="pick-button" disabled={!val.trim()} onClick={()=>setSelected(val)} aria-pressed={Boolean(selected===val&&val.trim())}>{selected===val&&val.trim()?'✓ Selected':'Select'}</button>{info&&<small className="offer-hint">{info.hint}</small>}</div>})}</div>
    <div className="actions"><button onClick={()=>setOffered(x=>x.length===3?[...x,'']:x.slice(0,3))}>{offered.length===3?'+ Fourth offer':'Remove fourth slot'}</button>{p.specialRemaining&&<label className="checkbox-label"><input type="checkbox" checked={specialSlot} onChange={e=>setSpecialSlot(e.target.checked)}/> Use my one-time special option</label>}</div>
    <div className="decision-footer"><div><b>Recommendation model migration pending</b><p className="micro">This v2 preview records reliable research data; it does not invent an Aether ranking. The <a href="https://robroyce.github.io/hordemind/" target="_blank" rel="noreferrer">current advisor</a> remains available during the migration.</p></div><button className="primary" disabled={!selected.trim()} onClick={commit}>Record chosen offer →</button></div>
    <p className="micro">Tip: when not typing, press 1–4 to select a filled offer row.</p>
   </section>}
  <div className="actions postrun"><button onClick={undo} disabled={p.chosen.length===0||complete}>Undo last decision</button><span className="micro">Every change is saved locally as a separate journal event.</span></div>
  {error&&<p className="error-msg" role="alert">{error}</p>}
 </div>;
}
