import {useEffect,useMemo,useState} from 'react';
import type {LocalState,CharacterProfile,RunRecord} from '../domain/schema';
import {newRun} from '../domain/run';
import {createLocalRepository} from '../storage/local';
import {StrategyLab} from './StrategyLab';
import {LiveRun} from './LiveRun';
import {Insights} from './Insights';

export type View='strategy'|'run'|'insights';
const repository=createLocalRepository();
function initialView():View{
 const v=window.location.hash.replace('#','');
 return v==='run'||v==='insights'||v==='strategy'?v:'run';
}
export function App(){
 const [data,setData]=useState<LocalState>(()=>repository.load());
 const [view,setView]=useState<View>(initialView);
 const [notice,setNotice]=useState('');
 const selectedProfile=useMemo(()=>data.profiles.find(x=>x.id===data.activeProfileId)??null,[data]);
 const activeRun=useMemo(()=>data.runs.find(x=>x.id===data.activeRunId)??null,[data]);
 useEffect(()=>{
  try{repository.save(data)}catch(err){setNotice('Could not save locally: '+String(err))}
 },[data]);
 useEffect(()=>{
  const onHash=()=>setView(initialView());
  window.addEventListener('hashchange',onHash);
  return()=>window.removeEventListener('hashchange',onHash);
 },[]);
 function navigate(tab:View){setView(tab);history.replaceState(null,'','#'+tab)}
 function saveProfile(profile:CharacterProfile){
  setData(old=>{
   const profiles=old.profiles.filter(p=>p.id!==profile.id).concat(profile);
   return {...old,profiles,activeProfileId:profile.id};
  });setNotice('Profile saved on this device.');
 }
 function start(profile:CharacterProfile,waves:number){
  const run=newRun(profile,waves);
  setData(old=>({...old,activeRunId:run.id,runs:[run,...old.runs]}));
  navigate('run');
  setNotice('Run started. You can record choices without signing in.');
 }
 function saveRun(run:RunRecord){
  setData(old=>({...old,runs:old.runs.map(x=>x.id===run.id?run:x)}));
  setNotice('Saved locally.');
 }
 return <div className="shell">
  <header className="topbar">
   <div className="brand" role="banner"><span className="brandicon" aria-hidden="true">✦</span><span>Horde<strong>Mind</strong></span><span className="edition">v2 preview</span></div>
   <div className="topright"><span className="offline-status">● Local-first</span><a href="https://github.com/RobRoyce/hordemind" target="_blank" rel="noreferrer">Source ↗</a></div>
  </header>
  <div className="app-grid">
   <nav className="sidebar" aria-label="Main navigation">
    {([
     ['strategy','◈','Strategy Lab','Character & War Plans'],
     ['run','▶','Live Run','Fast decision recording'],
     ['insights','▤','Insights','History & export']
    ] as const).map(([tab,icon,title,subtitle])=>
     <button className={'navitem '+(view===tab?'active':'')} aria-current={view===tab?'page':undefined} key={tab} onClick={()=>navigate(tab)}>
      <span className="navicon" aria-hidden="true">{icon}</span><span><b>{title}</b><small>{subtitle}</small></span>
     </button>
    )}
    <div className="nav-foot"><p>SEASON 15 · EXPERIMENTAL</p><span>Configuration and run recording are active. The simulator adapter and community syncing are not yet enabled in this preview.</span></div>
   </nav>
   <main className="workspace">
    {view==='strategy'&&<StrategyLab profiles={data.profiles} selectedProfile={selectedProfile} saveProfile={saveProfile} selectProfile={id=>setData(s=>({...s,activeProfileId:id}))} onStart={start}/>}
    {view==='run'&&<LiveRun run={activeRun} profile={selectedProfile} saveRun={saveRun} onStart={start} onGoStrategy={()=>navigate('strategy')}/>}
    {view==='insights'&&<Insights runs={data.runs} selectRun={id=>{setData(s=>({...s,activeRunId:id}));navigate('run')}} onExport={()=>repository.export()} />}
   </main>
  </div>
  <div className="status" role="status" aria-live="polite">{notice}</div>
 </div>
}
