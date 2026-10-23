import {useEffect,useMemo,useRef,useState} from 'react';
import type {CharacterProfile,RunRecord} from '../domain/schema';
import {MAX_OFFERS} from '../domain/schema';
import {decisionDraft,endRun,project,recordDecision,undoChoice,type Observation} from '../domain/run';
import {COMPASSES,resolveOffer} from '../catalog';
import {remainingWaves} from '../recommendation/model';
import {scenarioFromRun} from '../recommendation/scenario';
import {OfferPicker,emptySlot,slotFor,familyClass,type Slot} from './OfferPicker';
import {OfferRecommendations} from './OfferRecommendations';
import {useRecommendations} from './useRecommendations';

interface Props{
 run:RunRecord|null;profile:CharacterProfile|null;recentOffers:readonly string[];
 saveRun:(r:RunRecord,message:string)=>void;onStart:(p:CharacterProfile,waves:number)=>void;onGoStrategy:()=>void;
}
type CountKey='mass'|'fiend'|'hellborne'|'lord'|'spire';
const OBSERVABLES:[CountKey,string][]=[['mass','Masses killed'],['fiend','Fiends killed'],['hellborne','Hellborne killed'],['lord','Lords killed'],['spire','Spires completed']];


const freshSlots=()=>[emptySlot(),emptySlot(),emptySlot()];
const message=(e:unknown)=>e instanceof Error?e.message:String(e);

function parseAether(text:string,label:string):number|null{
 if(text.trim()==='')return null;
 const n=Number(text);
 if(!Number.isInteger(n)||n<0)throw new Error(`${label} must be a whole number of 0 or more`);
 return n;
}
function parseObservation(aether:string,counts:Record<string,string>):Observation{
 const eventCounts:Record<string,number>={};
 for(const [key,text] of Object.entries(counts)){
  if(text.trim()==='')continue;
  const n=Number(text);
  if(!Number.isInteger(n)||n<0)throw new Error('Event counts must be whole numbers of 0 or more');
  eventCounts[key]=n;
 }
 return {totalAether:parseAether(aether,'Aether'),...(Object.keys(eventCounts).length?{eventCounts}:{})};
}

export function LiveRun({run,profile,recentOffers,saveRun,onStart,onGoStrategy}:Props){
 if(!run)return <StartRun profile={profile} onStart={onStart} onGoStrategy={onGoStrategy}/>;
 return <ActiveRun key={run.id} run={run} profile={profile} recentOffers={recentOffers} saveRun={saveRun} onStart={onStart} onGoStrategy={onGoStrategy}/>;
}

function StartRun({profile,onStart,onGoStrategy}:Pick<Props,'profile'|'onStart'|'onGoStrategy'>){
 const [waves,setWaves]=useState(10);
 return <div className="content">
  <div className="section-intro"><h1>Live Run</h1><p>Enter the offers on your screen before each wave and get a ranked recommendation. Your character setup comes from Strategy Lab.</p></div>
  <section className="surface start-run">
   {!profile?<>
    <h2>Set up a character first</h2>
    <p>HordeMind needs your class, difficulty and War Plans to compare offers.</p>
    <button className="primary" onClick={onGoStrategy}>Set up a character</button>
   </>:<>
    <h2>{profile.name}</h2>
    <CharacterSummary profile={profile}/>
    <div className="start-actions">
     <label>Waves<select value={waves} onChange={e=>setWaves(Number(e.target.value))}>{COMPASSES.map(([n,name])=><option key={n} value={n}>{n} waves · {name}</option>)}</select></label>
     <button className="primary" onClick={()=>onStart(profile,waves)}>Start run</button>
     <button onClick={onGoStrategy}>Edit character</button>
    </div>
   </>}
  </section>
 </div>;
}

function CharacterSummary({profile}:{profile:CharacterProfile}){
 return <dl className="character-summary">
  <div><dt>Class</dt><dd>{profile.className}</dd></div>
  <div><dt>Difficulty</dt><dd>{profile.difficulty}</dd></div>
  <div><dt>Realm</dt><dd>{profile.realm}</dd></div>
  <div><dt>Build</dt><dd>{profile.buildName||'Not named'}</dd></div>
  <div><dt>Clear speed</dt><dd>{profile.killSpeed}</dd></div>
  <div><dt>Mobility</dt><dd>{profile.mobility}</dd></div>
  <div className="wide"><dt>War Plans</dt><dd>{profile.warPlanNodes.length?profile.warPlanNodes.join(', '):'None selected'}</dd></div>
 </dl>;
}

function ActiveRun({run,profile,recentOffers,saveRun,onStart,onGoStrategy}:Props&{run:RunRecord}){
 const p=useMemo(()=>project(run),[run]);
 const [slots,setSlots]=useState<Slot[]>(freshSlots);
 const [chosen,setChosen]=useState<number|null>(null);
 const [special,setSpecial]=useState<number|null>(null);
 const [aether,setAether]=useState('');
 const [counts,setCounts]=useState<Record<string,string>>({});
 const [ending,setEnding]=useState(false);
 const [error,setError]=useState('');
 const inputs=useRef<(HTMLInputElement|null)[]>([]);
 const inProgress=run.status==='in_progress';
 const deciding=inProgress&&!p.decisionsComplete;

 const filled=slots.flatMap((s,i)=>s.offer?[{i,offer:s.offer}]:[]);
 const offers=[...new Set(filled.map(x=>x.offer))];
 const scenario=useMemo(()=>deciding?scenarioFromRun(run):null,[run,deciding]);
 const rec=useRecommendations(scenario,offers);

 function resetForm(next:{slots?:Slot[];chosen?:number|null;special?:number|null;aether?:string;counts?:Record<string,string>}={}){
  setSlots(next.slots??freshSlots());setChosen(next.chosen??null);setSpecial(next.special??null);
  setAether(next.aether??'');setCounts(next.counts??{});setError('');
 }
 function updateSlot(i:number,slot:Slot){
  setSlots(s=>s.map((x,j)=>j===i?slot:x));
  if(!slot.offer){if(chosen===i)setChosen(null);if(special===i)setSpecial(null)}
 }
 function focusAfter(i:number){
  const next=slots.findIndex((s,j)=>j>i&&!s.offer);
  if(next>=0)inputs.current[next]?.focus();
  else inputs.current[i]?.blur();
 }
 function record(){
  try{
   const pending=slots.findIndex(s=>s.text.trim()&&!s.offer);
   if(pending>=0)throw new Error(`Offer ${pending+1} is not a known offering. Pick it from the list or record it as unlisted.`);
   if(filled.length<2)throw new Error('Enter at least two offers.');
   if(chosen===null||!slots[chosen]?.offer)throw new Error('Choose the offer you took.');
   const compact=(slot:number|null)=>slot===null?null:filled.findIndex(x=>x.i===slot);
   const fresh=rec.result&&!rec.busy;
   const next=recordDecision(run,{
    offered:filled.map(x=>x.offer),chosenIndex:compact(chosen)??-1,specialSlotIndex:compact(special),
    observation:p.wavesPlayedAtNextStep>0?parseObservation(aether,counts):null,
    recommendedOffer:fresh?rec.result?.recommended??null:null,modelVersion:fresh?rec.result?.modelVersion??null:null
   });
   saveRun(next,`Wave ${p.nextWave}: ${slots[chosen]?.offer} recorded`);
   resetForm();
   window.setTimeout(()=>inputs.current[0]?.focus(),0);
  }catch(e){setError(message(e))}
 }
 function undo(){
  try{
   const draft=decisionDraft(run);
   saveRun(undoChoice(run),'Last decision undone; its offers are back for editing');
   if(draft){
    const restored=draft.offered.map(slotFor);
    while(restored.length<3)restored.push(emptySlot());
    const reading=draft.observation;
    resetForm({slots:restored,chosen:draft.chosenIndex,special:draft.specialSlotIndex,
     aether:reading?.totalAether?.toString()??'',counts:Object.fromEntries(Object.entries(reading?.eventCounts??{}).map(([k,v])=>[k,String(v)]))});
   }else resetForm();
  }catch(e){setError(message(e))}
 }
 function finish(outcome:'completed'|'abandoned'){
  try{
   saveRun(endRun(run,outcome,parseAether(aether,'Final Aether')),outcome==='completed'?'Run completed and saved':'Run ended and saved');
   setEnding(false);setError('');
  }catch(e){setError(message(e))}
 }

 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{
   if(!deciding)return;
   if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();record();return}
   const target=event.target as HTMLElement|null;
   if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||event.metaKey||event.ctrlKey||event.altKey)return;
   const idx=Number(event.key)-1;
   if(Number.isInteger(idx)&&idx>=0&&slots[idx]?.offer){setChosen(idx);event.preventDefault()}
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 });

 const usedSpecial=p.chosen.find(x=>x.payload.usedSpecial);
 const bestSlot=rec.result?.recommended?slots.findIndex(s=>s.offer===rec.result?.recommended):-1;
 const remaining=remainingWaves({totalWaves:p.totalWaves,decisionWave:p.nextWave});

 return <div className="content runcontent">
  <header className="run-head">
   <div className="run-who">
    <strong>{p.profile.name}</strong>
    <span>{p.profile.className}</span><span>{p.profile.difficulty}</span><span>{p.profile.realm}</span>
    <details className="run-profile-summary">
     <summary>Run setup</summary>
     <CharacterSummary profile={p.profile}/>
     <p className="micro">Saved when this run started. Editing your character changes future runs only.</p>
     <button onClick={onGoStrategy}>Edit character</button>
    </details>
   </div>
   <div className="tally" aria-live="polite">
    <div><small>{deciding?'Before wave':'Wave'}</small><b>{Math.min(p.nextWave,p.totalWaves)}</b><span>of {p.totalWaves}</span></div>
    <div><small>Aether</small><b>{p.lastTotalAether??'—'}</b>{p.lastObservedWave!==null&&<span>after wave {p.lastObservedWave}</span>}</div>
   </div>
  </header>

  <ol className="wave-track" aria-label="Wave decisions">
   {Array.from({length:p.totalWaves},(_,i)=>{
    const choice=p.chosen[i];
    const state=choice?'done':i===p.chosen.length&&deciding?'current':'todo';
    return <li key={i} className={state} title={choice?`Wave ${i+1}: ${choice.payload.chosen}`:`Wave ${i+1}`}>
     <span className="visually-hidden">{choice?`Wave ${i+1}: ${choice.payload.chosen}`:`Wave ${i+1}: ${state==='current'?'deciding now':'not yet'}`}</span>
    </li>;
   })}
  </ol>

  {p.chosen.length>0&&<div className="stack" aria-label="Offers taken">
   {p.chosen.map(x=><span key={x.id} className={'chip '+familyClass(resolveOffer(x.payload.chosen))}>{x.payload.chosen}{x.payload.usedSpecial?' ◆':''}</span>)}
  </div>}
  {p.profile.specialOfferingAvailable&&<p className="special-status">
   {usedSpecial?`Black Pact offer used before wave ${usedSpecial.payload.wave}.`:'Black Pact offer unused. Mark it below when it appears.'}
  </p>}

  {run.status!=='in_progress'?<RunEnded run={run} profile={profile} onStart={onStart} totalAether={p.lastTotalAether} decisions={p.chosen.length}/>:
   deciding&&!ending?<div className="decision-grid">
    <section className="surface decision" aria-labelledby="decision-title">
     <h2 id="decision-title">Offers before wave {p.nextWave}</h2>
     {p.wavesPlayedAtNextStep>0&&<div className="reading">
      <label>Aether after wave {p.wavesPlayedAtNextStep} <span className="optional">optional</span>
       <input type="number" min="0" inputMode="numeric" placeholder="Total shown in game" value={aether} onChange={e=>setAether(e.target.value)}/>
      </label>
      <details className="secondary-details"><summary>Event counts for wave {p.wavesPlayedAtNextStep}</summary>
       <div className="form-grid">{OBSERVABLES.map(([id,label])=><label key={id}>{label}<input type="number" min="0" inputMode="numeric" placeholder="Not counted" value={counts[id]??''} onChange={e=>setCounts(x=>({...x,[id]:e.target.value}))}/></label>)}</div>
       <p className="micro">Leave a field blank when you didn't count it. Blank means unknown, not zero.</p>
      </details>
     </div>}
     <div className="offer-rows">
      {slots.map((slot,i)=><div key={i} className={'offer-row'+(chosen===i?' chosen':'')+(special===i?' special':'')}>
       <button type="button" className="choose" aria-pressed={chosen===i} disabled={!slot.offer}
        aria-label={`Choose offer ${i+1}${slot.offer?`: ${slot.offer}`:''}`} onClick={()=>setChosen(i)}>{i+1}</button>
       <OfferPicker ref={el=>{inputs.current[i]=el}} index={i} slot={slot} recent={recentOffers}
        onChange={s=>updateSlot(i,s)} onPicked={()=>focusAfter(i)}/>
       {p.specialRemaining&&<button type="button" className="pact" aria-pressed={special===i} disabled={!slot.offer}
        title="Mark as the Black Pact special offer" onClick={()=>setSpecial(s=>s===i?null:i)}>Pact</button>}
       {(i>=3||slot.text)&&<button type="button" className="clear" aria-label={i>=3?`Remove offer ${i+1}`:`Clear offer ${i+1}`}
        onClick={()=>{if(i>=3){setSlots(s=>s.filter((_,j)=>j!==i));setChosen(null);setSpecial(null)}else updateSlot(i,emptySlot())}}>×</button>}
      </div>)}
     </div>
     {slots.length<MAX_OFFERS&&<button type="button" className="add-offer" onClick={()=>setSlots(s=>[...s,emptySlot()])}>Add offer</button>}
     {special!==null&&<p className="micro">Taking the Pact offer uses it up. Taking any other offer keeps it for a later wave.</p>}
     <div className="record-bar">
      {bestSlot>=0&&rec.result&&!rec.busy&&<p className="rec-inline">Recommended: <b>{rec.result.recommended}</b>
       {chosen!==bestSlot&&<> · <button type="button" className="linklike" onClick={()=>setChosen(bestSlot)}>choose it</button></>}</p>}
      <button className="primary" onClick={record} disabled={chosen===null}>
       {chosen!==null&&slots[chosen]?.offer?`Take ${slots[chosen]?.offer}`:'Choose an offer'}
      </button>
      <span className="micro">Keys: 1–{slots.length} choose · Ctrl/⌘ Enter records</span>
     </div>
     {error&&<p className="error-msg" role="alert">{error}</p>}
    </section>
    <OfferRecommendations state={rec} slots={slots} chosen={chosen} special={special} remainingWaves={remaining} onChoose={setChosen}/>
   </div>:
   <section className="surface final">
    {ending?<>
     <h2>End this run now?</h2>
     <p>Use this if you died, left, or stopped recording. Everything recorded so far is kept.</p>
    </>:<>
     <h2>All {p.totalWaves} offers recorded</h2>
     <p>Play wave {p.totalWaves}. When it ends, enter the Aether total you finished with.</p>
    </>}
    <label className="reading">Final Aether <span className="optional">optional</span>
     <input type="number" min="0" inputMode="numeric" placeholder="Total shown in game" value={aether} onChange={e=>setAether(e.target.value)}/>
    </label>
    <div className="actions">
     {ending?<><button className="primary" onClick={()=>finish('abandoned')}>End run</button><button onClick={()=>{setEnding(false);setError('')}}>Keep recording</button></>:
      <button className="primary" onClick={()=>finish('completed')}>Finish run</button>}
    </div>
    {error&&<p className="error-msg" role="alert">{error}</p>}
   </section>}

  {inProgress&&<div className="actions run-actions">
   <button onClick={undo} disabled={p.chosen.length===0}>Undo last decision</button>
   {!ending&&<button className="quiet" onClick={()=>{setEnding(true);setError('')}}>End run early</button>}
  </div>}
 </div>;
}

function RunEnded({run,profile,onStart,totalAether,decisions}:{run:RunRecord;profile:CharacterProfile|null;onStart:Props['onStart'];totalAether:number|null;decisions:number}){
 const p=project(run);
 return <section className="surface final">
  <h2>{run.status==='completed'?'Run complete':'Run ended'}</h2>
  <p>{decisions} of {p.totalWaves} offers recorded{totalAether!==null?`, ${totalAether} Aether`:''}. It's saved on this device; see Insights for history and export.</p>
  {profile&&<button className="primary" onClick={()=>onStart(profile,p.totalWaves)}>Start another {p.totalWaves}-wave run</button>}
 </section>;
}
