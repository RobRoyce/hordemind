import {useEffect,useMemo,useRef,useState} from 'react';
import type {LocalState,CharacterProfile,RunRecord} from '../domain/schema';
import {newProfile,newRun} from '../domain/run';
import {validateProfile} from '../domain/profile';
import {createLocalRepository,downloadExport,STORAGE_KEY} from '../storage/local';
import {mergeStates} from '../domain/merge';
import {StrategyLab} from './StrategyLab';
import {LiveRun} from './LiveRun';
import {Insights} from './Insights';

export type View='strategy'|'run'|'insights';
const repository=createLocalRepository();
const RECENT_LIMIT=8;

function viewFromHash():View{
 const v=window.location.hash.replace('#','');
 return v==='run'||v==='insights'||v==='strategy'?v:'run';
}
const runProfileId=(run:RunRecord|undefined)=>{
 const started=run?.events.find(e=>e.type==='run_started');
 return started?.type==='run_started'?started.payload.profile.id:null;
};
/** Most recently presented offers across all runs, newest first. */
function recentOffers(runs:RunRecord[]):string[]{
 const seen=new Set<string>();
 const events=runs.flatMap(r=>r.events).filter(e=>e.type==='offers_presented').sort((a,b)=>b.at.localeCompare(a.at));
 for(const e of events){if(e.type==='offers_presented')for(const o of e.payload.offered)seen.add(o);if(seen.size>=RECENT_LIMIT)break}
 return [...seen].slice(0,RECENT_LIMIT);
}

export function App(){
 const [initial]=useState(()=>repository.load());
 const [data,setData]=useState<LocalState>(initial.state);
 // Unreadable stored data is never overwritten until the user chooses to start fresh.
 const [blocked,setBlocked]=useState(initial.status==='unreadable');
 const [saveError,setSaveError]=useState('');
 const [view,setView]=useState<View>(viewFromHash);
 const [notice,setNotice]=useState('');
 const noticeTimer=useRef<number|undefined>(undefined);
 const selectedProfile=useMemo(()=>data.profiles.find(x=>x.id===data.activeProfileId)??null,[data]);
 const activeRun=useMemo(()=>data.runs.find(x=>x.id===data.activeRunId)??null,[data]);
 const recent=useMemo(()=>recentOffers(data.runs),[data.runs]);

 useEffect(()=>{
  if(blocked)return;
  try{repository.save(data);setSaveError('')}
  catch(err){setSaveError(err instanceof Error?err.message:String(err))}
 },[data,blocked]);
 // Another tab saved: fold its runs and edits in, so this tab never writes over them.
 useEffect(()=>{
  const onStorage=(event:StorageEvent)=>{
   if(event.key!==STORAGE_KEY||!event.newValue)return;
   const theirs=repository.parse(event.newValue);
   if(!theirs)return;
   setData(old=>{const merged=mergeStates(old,theirs);return JSON.stringify(merged)===JSON.stringify(old)?old:merged});
  };
  window.addEventListener('storage',onStorage);
  return()=>window.removeEventListener('storage',onStorage);
 },[]);
 useEffect(()=>{
  const onHash=()=>setView(viewFromHash());
  window.addEventListener('hashchange',onHash);
  return()=>window.removeEventListener('hashchange',onHash);
 },[]);

 function say(text:string){
  setNotice(text);
  window.clearTimeout(noticeTimer.current);
  noticeTimer.current=window.setTimeout(()=>setNotice(''),2600);
 }
 function navigate(tab:View){setView(tab);history.replaceState(null,'','#'+tab)}
 function selectProfile(id:string){
  setData(s=>({...s,activeProfileId:id,activeRunId:runProfileId(s.runs.find(r=>r.id===s.activeRunId))===id?s.activeRunId:null}));
 }
 function updateProfile(profile:CharacterProfile):string|null{
  const result=validateProfile(profile);
  if('error' in result)return result.error;
  setData(old=>({...old,profiles:old.profiles.map(p=>p.id===profile.id?result.profile:p)}));
  say('Saved');
  return null;
 }
 function createProfile(name:string,className:CharacterProfile['className']){
  const profile=newProfile(name,className);
  setData(old=>({...old,profiles:[...old.profiles,profile],activeProfileId:profile.id,activeRunId:null}));
  say(`${name} created`);
 }
 function start(profile:CharacterProfile,waves:number){
  const run=newRun(profile,waves);
  setData(old=>({...old,activeRunId:run.id,activeProfileId:profile.id,runs:[run,...old.runs]}));
  navigate('run');
  say('Run started');
 }
 function saveRun(run:RunRecord,message:string){
  setData(old=>({...old,runs:old.runs.map(x=>x.id===run.id?run:x)}));
  say(message);
 }

 return <div className="shell">
  <header className="topbar">
   <div className="brand"><span className="brandicon" aria-hidden="true">✦</span><span>Horde<strong>Mind</strong></span><span className="edition">v2 preview</span></div>
   <div className="topright"><span className="offline-status">Saved on this device</span><a href="https://github.com/RobRoyce/hordemind" target="_blank" rel="noreferrer">Source ↗</a></div>
  </header>
  {blocked&&<div className="banner" role="alert">
   <p><strong>Saved data on this device couldn't be read.</strong> It may come from a newer version of HordeMind. A copy is kept in browser storage, and nothing will be saved until you choose what to do.</p>
   <div className="actions">
    <button onClick={()=>downloadExport(localStorage.getItem(STORAGE_KEY)??'')}>Download the unreadable data</button>
    <button onClick={()=>setBlocked(false)}>Start fresh on this device</button>
   </div>
  </div>}
  {saveError&&<div className="banner" role="alert"><p><strong>Couldn't save on this device:</strong> {saveError}. Recent changes exist only in this tab. Export from Insights to keep them.</p></div>}
  <div className="app-grid">
   <nav className="sidebar" aria-label="Main navigation">
    {([
     ['strategy','◈','Strategy Lab','Character and War Plans'],
     ['run','▶','Live Run','Offers and recommendations'],
     ['insights','▤','Insights','History and export']
    ] as const).map(([tab,icon,title,subtitle])=>
     <button className={'navitem '+(view===tab?'active':'')} aria-current={view===tab?'page':undefined} key={tab} onClick={()=>navigate(tab)}>
      <span className="navicon" aria-hidden="true">{icon}</span><span><b>{title}</b><small>{subtitle}</small></span>
     </button>
    )}
    <div className="nav-foot"><p>Season 15 · experimental</p><span>Recommendations come from an uncalibrated simulator. Runs stay in this browser; nothing is uploaded.</span></div>
   </nav>
   <main className="workspace">
    {view==='strategy'&&<StrategyLab profiles={data.profiles} selectedProfile={selectedProfile} onUpdate={updateProfile} onCreate={createProfile} onSelect={selectProfile} onStart={start}/>}
    {view==='run'&&<LiveRun run={activeRun} profile={selectedProfile} recentOffers={recent} saveRun={saveRun} onStart={start} onGoStrategy={()=>navigate('strategy')}/>}
    {view==='insights'&&<Insights runs={data.runs} selectRun={id=>{setData(s=>({...s,activeRunId:id}));navigate('run')}} onExport={()=>repository.export(data)}/>}
   </main>
  </div>
  <div className={'status'+(notice?' visible':'')} role="status" aria-live="polite">{notice}</div>
 </div>;
}
