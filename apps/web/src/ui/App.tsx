import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {LocalState,CharacterProfile,RunRecord} from '../domain/schema';
import {newProfile,newRun} from '../domain/run';
import {validateProfile} from '../domain/profile';
import {createLocalRepository,downloadExport,STORAGE_KEY} from '../storage/local';
import {mergeStates,reconcile,sameState} from '../domain/merge';
import {Character} from './character/Character';
import {LiveRun} from './live/LiveRun';
import {Insights} from './insights/Insights';
import {useSync,type SyncState} from './useSync';
import {REPO_URL,newIssueUrl} from './report';
import {AppNav,Button,Notice,Toast,cx,useNarrow,type ToastAction} from './kit';
import {Footer} from './shell/Footer';
import {viewFromHash,type View} from './shell/route';
import {nextToast,type ToastState} from './shell/toast';
import s from './shell/App.module.css';

const repository=createLocalRepository();
const RECENT_LIMIT=8;
const NAV=[{id:'character',label:'Character'},{id:'run',label:'Live Run'},{id:'insights',label:'Insights'}] as const;

/** Reads the view from the address bar, rewriting "#strategy" to "#character". */
function currentView():View{
 const view=viewFromHash(window.location.hash);
 if(window.location.hash==='#strategy')history.replaceState(null,'','#character');
 return view;
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

function syncLabel(sync:SyncState,short:boolean){
 if(sync.user&&sync.phase==='syncing')return 'Syncing…';
 if(sync.user&&sync.phase==='error')return short?'Sync failed':'Sync failed: see Insights';
 if(short)return 'Saved';
 return sync.user&&sync.last?'Saved here and synced':'Saved on this device';
}

export function App(){
 const [initial]=useState(()=>repository.load());
 const [data,setData]=useState<LocalState>(initial.state);
 // Unreadable stored data is never overwritten until the user chooses to start fresh.
 const [blocked,setBlocked]=useState(initial.status==='unreadable');
 const [saveError,setSaveError]=useState('');
 const [view,setView]=useState<View>(currentView);
 const [toast,setToast]=useState<ToastState|null>(null);
 const toastTimer=useRef<number|undefined>(undefined);
 const narrow=useNarrow();
 const dataRef=useRef(data);dataRef.current=data;
 const blockedRef=useRef(blocked);blockedRef.current=blocked;
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
   const {adopt,writeBack}=reconcile(dataRef.current,theirs);
   if(adopt)setData(adopt);
   else if(writeBack&&!blockedRef.current)try{repository.save(writeBack)}catch(err){setSaveError(err instanceof Error?err.message:String(err))}
  };
  window.addEventListener('storage',onStorage);
  return()=>window.removeEventListener('storage',onStorage);
 },[]);
 useEffect(()=>{
  const onHash=()=>setView(currentView());
  window.addEventListener('hashchange',onHash);
  return()=>window.removeEventListener('hashchange',onHash);
 },[]);

 const adopt=useCallback((remote:LocalState)=>setData(old=>{
  const merged=mergeStates(old,remote);
  // A restored device has no active character yet; pick the most recently edited one.
  if(!merged.activeProfileId&&merged.profiles.length)merged.activeProfileId=[...merged.profiles].sort((x,y)=>y.updatedAt.localeCompare(x.updatedAt))[0]!.id;
  return sameState(merged,old)?old:merged;
 }),[]);
 const [sync,syncControls]=useSync(data,adopt,!blocked);

 /** Shows a toast, replacing any toast already showing. */
 function say(text:string,action?:ToastAction){
  const next=nextToast(text,action&&{label:action.label,onClick:()=>{dismiss();action.onClick()}});
  setToast(next);
  window.clearTimeout(toastTimer.current);
  toastTimer.current=window.setTimeout(()=>setToast(null),next.ms);
 }
 function dismiss(){
  window.clearTimeout(toastTimer.current);
  setToast(null);
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
 /** Saves a run. With `undo`, the toast offers to reverse the change. */
 function saveRun(run:RunRecord,message:string,undo?:()=>void){
  setData(old=>({...old,runs:old.runs.map(x=>x.id===run.id?run:x)}));
  say(message,undo&&{label:'Undo',onClick:undo});
 }

 return <div className={s.app}>
  <AppNav items={NAV} current={view} onSelect={id=>navigate(viewFromHash(id))} status={syncLabel(sync,narrow)} sourceUrl={REPO_URL}/>
  {(blocked||saveError)&&<div className={s.banners}>
   {blocked&&<Notice tone="error">
    <p><strong>Saved data on this device couldn't be read.</strong> It may come from a newer version of HordeMind. A copy is kept in browser storage, and nothing will be saved until you choose what to do.</p>
    <div className={s.actions}>
     <Button onClick={()=>downloadExport(localStorage.getItem(STORAGE_KEY)??'')}>Download the unreadable data</Button>
     <Button onClick={()=>setBlocked(false)}>Start fresh on this device</Button>
    </div>
   </Notice>}
   {saveError&&<Notice tone="error"><p><strong>Couldn't save on this device:</strong> {saveError}. Recent changes exist only in this tab. Export from Insights to keep them.</p></Notice>}
  </div>}
  <main className={cx(s.main,s[view])}>
   {view==='character'&&<Character profiles={data.profiles} selectedProfile={selectedProfile} onUpdate={updateProfile} onCreate={createProfile} onSelect={selectProfile} onStart={start}/>}
   {view==='run'&&<LiveRun run={activeRun} profile={selectedProfile} recentOffers={recent} saveRun={saveRun} onStart={start} onGoCharacter={()=>navigate('character')}/>}
   {view==='insights'&&<Insights runs={data.runs} selectRun={id=>{setData(old=>({...old,activeRunId:id}));navigate('run')}} onExport={()=>repository.export(data)} sync={sync} syncControls={syncControls}/>}
  </main>
  <Footer reportUrl={newIssueUrl} sourceUrl={REPO_URL}/>
  <Toast message={toast?.message??null} {...(toast?.action?{action:toast.action}:{})}/>
 </div>;
}
