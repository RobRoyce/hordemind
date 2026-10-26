import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {CharacterProfile,RunRecord} from '../../domain/schema';
import {MAX_OFFERS} from '../../domain/schema';
import {decisionDraft,endRun,project,recordDecision,undoChoice,type Observation} from '../../domain/run';
import {remainingWaves} from '../../recommendation/model';
import {scenarioFromRun} from '../../recommendation/scenario';
import {Button,DisclosureToggle,Field,Notice,NumberField,SectionHeading,useNarrow} from '../kit';
import {useRecommendations} from '../useRecommendations';
import {EndRunPanel} from './EndRunPanel';
import {OfferPicker,PickerSheet,pickerTitle} from './OfferPicker';
import {OfferSlot} from './OfferSlot';
import {PactAdvice} from './PactAdvice';
import {PickCard} from './PickCard';
import {RecordBar} from './RecordBar';
import {RunHeader} from './RunHeader';
import {StartRun} from './StartRun';
import {likelyFamily,pactFamily} from './pickerModel';
import {NO_SELECTION,pick,reconcile,type Selection} from './selection';
import {emptySlot,slotFor,type Slot} from './slot';
import s from './LiveRun.module.css';

interface Props{
 run:RunRecord|null;profile:CharacterProfile|null;recentOffers:readonly string[];
 /** Saves the run. With `undo`, the toast offers to reverse the change. */
 saveRun:(run:RunRecord,message:string,undo?:()=>void)=>void;
 onStart:(profile:CharacterProfile,waves:number)=>void;
 onGoCharacter:()=>void;
}

type CountKey='mass'|'fiend'|'hellborne'|'lord'|'spire';
const OBSERVABLES:[CountKey,string][]=[['mass','Masses killed'],['fiend','Fiends killed'],['hellborne','Hellborne killed'],['lord','Lords killed'],['spire','Spires completed']];
const PACT_TITLE='Black Pact offer';

const freshSlots=(n:number)=>Array.from({length:n},emptySlot);

/** A row's key outlives index shifts, so its open details and picker state stay with it. */
type Row=Slot&{key:number};
let lastRowKey=0;
const keyed=(slot:Slot):Row=>({...slot,key:++lastRowKey});
/** Offer rows a wave starts with: Reign in Hell adds one, Total Chaos removes one (tooltips). */
export const regularOffers=(warPlanNodes:readonly string[])=>warPlanNodes.includes('Reign in Hell')?4:warPlanNodes.includes('Total Chaos')?2:3;
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

export function LiveRun({run,profile,recentOffers,saveRun,onStart,onGoCharacter}:Props){
 if(!run)return <StartRun profile={profile} onStart={onStart} onGoCharacter={onGoCharacter}/>;
 return <ActiveRun key={run.id} run={run} profile={profile} recentOffers={recentOffers} saveRun={saveRun} onStart={onStart} onGoCharacter={onGoCharacter}/>;
}

interface Form{slots:Slot[];special:number|null;selection:Selection;aether:string;counts:Record<string,string>}

function ActiveRun({run,profile,recentOffers,saveRun,onStart,onGoCharacter}:Props&{run:RunRecord}){
 const p=useMemo(()=>project(run),[run]);
 const baseSlots=regularOffers(p.profile.warPlanNodes);
 const latest=useRef(run);
 latest.current=run;
 const [slots,setSlots]=useState<Row[]>(()=>freshSlots(baseSlots).map(keyed));
 /** The Black Pact row, which stays last. */
 const [special,setSpecial]=useState<number|null>(null);
 const [selection,setSelection]=useState<Selection>(NO_SELECTION);
 const [aether,setAether]=useState('');
 const [counts,setCounts]=useState<Record<string,string>>({});
 const [ending,setEnding]=useState(false);
 const [countsOpen,setCountsOpen]=useState(false);
 const [notesOpen,setNotesOpen]=useState(false);
 const countsId=useId(),notesId=useId();
 const [error,setError]=useState('');
 const [openRow,setOpenRow]=useState<number|null>(null);
 const narrow=useNarrow();
 const inputs=useRef<(HTMLInputElement|null)[]>([]);
 const pickerReturn=useRef<HTMLElement|null>(null);
 const panelHeading=useRef<HTMLHeadingElement>(null);
 /** A row to fill once the next render commits: focused, or with its phone sheet open. Filled rows just take focus. */
 const fillAfterRender=useRef<{row:number;open:boolean}|null>(null);
 const inProgress=run.status==='in_progress';
 const deciding=inProgress&&!p.decisionsComplete;

 const filled=slots.flatMap((slot,i)=>slot.offer?[{i,offer:slot.offer}]:[]);
 const offers=[...new Set(filled.map(x=>x.offer))];
 const pactOffer=special!==null?slots[special]?.offer??null:null;
 const scenario=useMemo(()=>deciding?scenarioFromRun(run):null,[run,deciding]);
 const rec=useRecommendations(scenario,offers,pactOffer);
 const result=rec.result;
 // A result is fresh when it answers exactly the offers on screen now.
 const fresh=!!result&&!rec.busy&&result.assessments.length===offers.length&&offers.every(o=>result.assessments.some(a=>a.offer===o));
 const bestIndex=result?.recommended?slots.findIndex(slot=>slot.offer===result.recommended):-1;
 const bestSlot=bestIndex>=0?bestIndex:null;
 const current=reconcile(selection,{filled:slots.map(slot=>!!slot.offer),bestSlot,fresh});
 const chosenOffer=current.slot!==null?slots[current.slot]?.offer??null:null;

 function resetForm(next:Partial<Form>={}){
  setSlots((next.slots??freshSlots(baseSlots)).map(keyed));setSpecial(next.special??null);setSelection(next.selection??NO_SELECTION);
  setAether(next.aether??'');setCounts(next.counts??{});setError('');setOpenRow(null);
 }
 function updateSlot(i:number,slot:Slot){
  setSlots(all=>all.map((x,j)=>j===i?{...slot,key:x.key}:x));
  // A picked row whose offer changes stops being the player's pick.
  if(selection.slot===i&&slot.offer!==slots[i]?.offer)setSelection(NO_SELECTION);
 }
 function removeRow(i:number){
  setSlots(all=>all.filter((_,j)=>j!==i));
  setSpecial(sp=>sp===null||sp===i?null:sp>i?sp-1:sp);
  setSelection(sel=>sel.slot===null||sel.slot===i?NO_SELECTION:sel.slot>i?{...sel,slot:sel.slot-1}:sel);
  setOpenRow(null);
 }
 function openPicker(i:number,open:boolean){
  setOpenRow(r=>open?i:r===i?null:r);
  if(open)pickerReturn.current=inputs.current[i]??null;
 }
 /** Starts filling a row that mounts on the next render. */
 function fillSoon(i:number){
  fillAfterRender.current={row:i,open:narrow};
 }
 function addRow(){
  const at=special??slots.length;
  setSlots(all=>[...all.slice(0,at),keyed(emptySlot()),...all.slice(at)]);
  if(special!==null)setSpecial(special+1);
  setSelection(sel=>sel.slot!==null&&sel.slot>=at?{...sel,slot:sel.slot+1}:sel);
  fillSoon(at);
 }
 function addPact(){
  setSlots(all=>[...all,keyed(emptySlot())]);
  setSpecial(slots.length);
  fillSoon(slots.length);
 }
 /** The next empty regular row after `i`, wrapping around. `slots` still shows row `i` empty. */
 function nextEmpty(i:number){
  const order=[...slots.keys()].filter(j=>j!==i&&j!==special).sort((a,b)=>(a<i?a+slots.length:a)-(b<i?b+slots.length:b));
  return order.find(j=>!slots[j]?.offer)??null;
 }
 function afterPick(i:number){
  const next=nextEmpty(i);
  // A pick in the phone sheet moves the sheet on; anywhere else, focus moves to the next row.
  if(narrow&&openRow===i){
   setOpenRow(next);
   if(next!==null)pickerReturn.current=inputs.current[next]??null;
   return;
  }
  if(next!==null)inputs.current[next]?.focus();
  else{setOpenRow(null);inputs.current[i]?.blur()}
 }

 function record(){
  try{
   const pending=slots.findIndex(slot=>slot.text.trim()&&!slot.offer);
   if(pending>=0)throw new Error(`Offer ${pending+1} is not a known offering. Pick it from the list or record it as unlisted.`);
   if(filled.length<2)throw new Error('Enter at least two offers.');
   if(current.slot===null||!chosenOffer)throw new Error('Choose the offer you took.');
   const compact=(slot:number)=>filled.findIndex(x=>x.i===slot);
   const next=recordDecision(run,{
    offered:filled.map(x=>x.offer),chosenIndex:compact(current.slot),
    specialSlotIndex:special!==null&&pactOffer?compact(special):null,
    observation:p.wavesPlayedAtNextStep>0?parseObservation(aether,counts):null,
    recommendedOffer:fresh?result?.recommended??null:null,modelVersion:fresh?result?.modelVersion??null:null,
    ...(current.source?{choiceSource:current.source}:{})
   });
   saveRun(next,`Wave ${p.nextWave}: ${chosenOffer} recorded`,undo);
   resetForm();
   fillAfterRender.current={row:0,open:false};
  }catch(e){setError(message(e))}
 }
 /** Reverses the last decision and puts its offers back in the rows. Reads the newest run, so the toast's Undo works too. */
 function undo(){
  try{
   const now=latest.current;
   const draft=decisionDraft(now);
   saveRun(undoChoice(now),'Last decision undone; its offers are back for editing');
   setEnding(false);
   if(!draft){resetForm();fillAfterRender.current={row:0,open:false};return}
   const sp=draft.specialSlotIndex;
   const rows:Slot[]=[],rowOf=new Map<number,number>();
   draft.offered.forEach((offer,k)=>{if(k!==sp){rowOf.set(k,rows.length);rows.push(slotFor(offer))}});
   while(rows.length<baseSlots)rows.push(emptySlot());
   let pactRow:number|null=null;
   const pactOfferBack=sp!==null?draft.offered[sp]:undefined;
   if(sp!==null&&pactOfferBack!==undefined){pactRow=rows.length;rowOf.set(sp,pactRow);rows.push(slotFor(pactOfferBack))}
   const chosenRow=rowOf.get(draft.chosenIndex);
   const reading=draft.observation;
   // A restored default goes back to pre-selection, so re-taking it untouched still records a default.
   resetForm({slots:rows,special:pactRow,
    selection:chosenRow===undefined||draft.choiceSource==='default'?NO_SELECTION:pick(chosenRow),
    aether:reading?.totalAether?.toString()??'',
    counts:Object.fromEntries(Object.entries(reading?.eventCounts??{}).map(([k,v])=>[k,String(v)]))});
   // The toast that held Undo is gone, so focus goes to the restored choice.
   fillAfterRender.current={row:chosenRow??0,open:false};
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
   if(!deciding||ending)return;
   if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();record();return}
   const target=event.target as HTMLElement|null;
   if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||event.metaKey||event.ctrlKey||event.altKey)return;
   // Number keys are ignored while a picker is open.
   const idx=Number(event.key)-1;
   if(openRow===null&&Number.isInteger(idx)&&idx>=0&&slots[idx]?.offer){setSelection(pick(idx));event.preventDefault()}
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 });

 // Filling waits for the render that mounts or empties the row, so its picker sees it empty.
 // A layout effect lands in the same commit, before the player can move focus elsewhere.
 useLayoutEffect(()=>{
  const fill=fillAfterRender.current;
  if(!fill)return;
  fillAfterRender.current=null;
  if(fill.open)openPicker(fill.row,true);
  else inputs.current[fill.row]?.focus();
 });

 // The panel that replaces the focused control receives focus, so keyboard and screen-reader users follow along.
 const panel=run.status!=='in_progress'?'ended':ending?'ending':deciding?'deciding':'final';
 const firstPanel=useRef(true);
 useEffect(()=>{
  if(firstPanel.current){firstPanel.current=false;return}
  // Undo may already have focused the restored choice; otherwise focus left with the old panel.
  if(panel!=='deciding')panelHeading.current?.focus();
  else if(document.activeElement===document.body)inputs.current[0]?.focus();
 },[panel]);

 const usedSpecial=p.chosen.find(x=>x.payload.usedSpecial);
 const lastPick=p.chosen.at(-1)?.payload.chosen??null;
 const likely=likelyFamily(p.profile.warPlanNodes,lastPick);
 const remaining=remainingWaves({totalWaves:p.totalWaves,decisionWave:p.nextWave});
 const pactStatus=p.profile.specialOfferingAvailable?usedSpecial?`Black Pact used before wave ${usedSpecial.payload.wave}`:'Black Pact unused':null;
 const general=result?.warnings.filter(w=>!w.startsWith('Some offers')&&!w.startsWith('The best offer changes'))??[];
 const footnote=result?`${result.samples} simulated runs, ${remaining} waves left`:null;
 const reportContext=`Before wave ${p.nextWave} of ${p.totalWaves}. Taken so far: ${p.chosen.map(x=>x.payload.chosen).join(', ')||'none'}. On screen: ${offers.join(', ')}. War Plan: ${p.profile.warPlanNodes.join(', ')||'none'}. Clear speed ${p.profile.killSpeed}, mobility ${p.profile.mobility}.`;
 const titleFor=(i:number)=>i===special?PACT_TITLE:pickerTitle(i,slots.length);

 return <div className={s.run}>
  <RunHeader profile={p.profile} wave={Math.min(p.nextWave,p.totalWaves)} totalWaves={p.totalWaves} deciding={deciding}
   aether={p.lastTotalAether} observedWave={p.lastObservedWave} pactStatus={pactStatus} onEditCharacter={onGoCharacter}
   taken={p.chosen.map(x=>({id:x.id,offer:x.payload.chosen,pact:x.payload.usedSpecial}))}/>

  {run.status!=='in_progress'?<RunEnded run={run} profile={profile} onStart={onStart} headingRef={panelHeading}/>:
   deciding&&!ending?<>
    {p.wavesPlayedAtNextStep>0&&<div>
     <div className={s.reading}>
      <div className={s.aether}>
       <Field label={`Aether after wave ${p.wavesPlayedAtNextStep} (optional)`}>
        {wire=><NumberField wire={wire} min={0} placeholder="Total shown in game" value={aether} onChange={e=>setAether(e.target.value)}/>}
       </Field>
      </div>
      <DisclosureToggle open={countsOpen} onToggle={()=>setCountsOpen(o=>!o)} controls={countsId}>Event counts</DisclosureToggle>
     </div>
     <div id={countsId} className={s.countsPanel} hidden={!countsOpen}>
      <div className={s.counts}>
       {OBSERVABLES.map(([id,label])=><Field key={id} label={label}>
        {wire=><NumberField wire={wire} min={0} placeholder="Not counted" value={counts[id]??''} onChange={e=>setCounts(x=>({...x,[id]:e.target.value}))}/>}
       </Field>)}
      </div>
      <p className={s.note}>Event counts for wave {p.wavesPlayedAtNextStep}. Leave a field blank when you didn't count it. Blank means unknown, not zero.</p>
     </div>
    </div>}

    <div>
     <SectionHeading>Offers before wave {p.nextWave}</SectionHeading>
     <ol className={s.rows} aria-label="Offers on screen">
      {slots.map((slot,i)=>{
       const pactRow=i===special,removable=pactRow||i>=baseSlots;
       return <OfferSlot key={slot.key} index={i} slot={slot} pact={pactRow} selected={current.slot===i} best={bestSlot===i}
        busy={rec.busy} assessment={slot.offer&&result?result.assessments.find(a=>a.offer===slot.offer)??null:null}
        reportContext={reportContext} removable={removable}
        onSelect={()=>setSelection(pick(i))} onClear={()=>removable?removeRow(i):updateSlot(i,emptySlot())}
        picker={<OfferPicker ref={el=>{inputs.current[i]=el}} index={i} slot={slot} recent={recentOffers} likely={likely}
         startFamily={pactRow?pactFamily(lastPick):null} total={slots.length} title={titleFor(i)}
         open={openRow===i} onOpenChange={o=>openPicker(i,o)} onChange={next=>updateSlot(i,next)} onPicked={()=>afterPick(i)}/>}/>;
      })}
     </ol>
     <div className={s.add}>
      {slots.length<MAX_OFFERS&&<Button variant="text" onClick={addRow}>Add another offer</Button>}
      {p.specialRemaining&&special===null&&slots.length<MAX_OFFERS&&<Button variant="text" className={s.addPact} onClick={addPact}>Add the Black Pact offer</Button>}
     </div>
    </div>

    {narrow&&<PickerSheet row={openRow} title={openRow===null?'':titleFor(openRow)} recent={recentOffers} likely={likely}
     startFamily={openRow!==null&&openRow===special?pactFamily(lastPick):null} returnFocus={pickerReturn}
     onClose={()=>setOpenRow(null)} onPick={slot=>{if(openRow===null)return;updateSlot(openRow,slot);afterPick(openRow)}}/>}

    {rec.error?<Notice tone="error"><p><strong>The simulator failed:</strong> {rec.error}</p></Notice>
     :result?<>
      {result.conditional&&<Notice tone="warning"><p>Some offers aren't modeled yet, so the best modeled offer may not be the best offer.</p></Notice>}
      <PickCard result={result} busy={rec.busy} reportContext={reportContext}/>
      {result.pact&&<PactAdvice pact={result.pact}/>}
     </>
     :<p className={s.waiting} role="status">{rec.busy||offers.length>=2?'Simulating…':'Enter at least two offers to compare them.'}</p>}

    {error&&<Notice tone="error"><p>{error}</p></Notice>}
    <RecordBar offer={chosenOffer} rows={slots.length} onRecord={record}/>
   </>:
   <EndRunPanel mode={ending?'ending':'final'} totalWaves={p.totalWaves} aether={aether} onAether={setAether}
    onFinish={()=>finish('completed')} onEnd={()=>finish('abandoned')} onKeep={()=>{setEnding(false);setError('')}}
    error={error} headingRef={panelHeading}/>}

  {inProgress&&<div>
   <div className={s.quiet}>
    <Button variant="text" onClick={undo} disabled={p.chosen.length===0}>Undo last decision</Button>
    {!ending&&<Button variant="text" onClick={()=>{setEnding(true);setError('')}}>End run early</Button>}
    {footnote&&deciding&&!ending&&<span className={s.footnote}>
     {general.length?<DisclosureToggle open={notesOpen} onToggle={()=>setNotesOpen(o=>!o)} controls={notesId}>{footnote}</DisclosureToggle>:footnote}
    </span>}
   </div>
   {footnote&&deciding&&!ending&&general.length>0&&<div id={notesId} className={s.notes} hidden={!notesOpen}>
    {general.map((w,i)=><p key={i}>{w}</p>)}
   </div>}
  </div>}
 </div>;
}

function RunEnded({run,profile,onStart,headingRef}:{run:RunRecord;profile:CharacterProfile|null;onStart:Props['onStart'];headingRef:React.Ref<HTMLHeadingElement>}){
 const p=project(run);
 return <section className={s.ended} aria-labelledby="run-ended">
  <h2 id="run-ended" tabIndex={-1} ref={headingRef} className={s.endedHeading}>{run.status==='completed'?'Run complete':'Run ended'}</h2>
  <p className={s.endedText}>{p.chosen.length} of {p.totalWaves} offers recorded{p.lastTotalAether!==null?`, ${p.lastTotalAether} Aether`:''}. It's saved on this device; see Insights for history and export.</p>
  {profile&&<div><Button variant="primary" onClick={()=>onStart(profile,p.totalWaves)}>Start another {p.totalWaves}-wave run</Button></div>}
 </section>;
}
