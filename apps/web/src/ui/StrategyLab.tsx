import {useEffect,useState} from 'react';
import {GAME_CLASSES,type CharacterProfile} from '../domain/schema';
import {newProfile} from '../domain/run';
import {WAR_PLAN_NODES,WAR_PLAN_HOME} from '../catalog';

interface Props{
 profiles:CharacterProfile[];selectedProfile:CharacterProfile|null;
 saveProfile:(p:CharacterProfile)=>void;selectProfile:(id:string)=>void;
 onStart:(p:CharacterProfile,waves:number)=>void;
}
export function StrategyLab({profiles,selectedProfile,saveProfile,selectProfile,onStart}:Props){
 const [draft,setDraft]=useState<CharacterProfile>(()=>selectedProfile?structuredClone(selectedProfile):newProfile('My character','Paladin'));
 const [waves,setWaves]=useState(10);
 useEffect(()=>{if(selectedProfile)setDraft(structuredClone(selectedProfile))},[selectedProfile?.id]);
 const edit=<K extends keyof CharacterProfile>(key:K,value:CharacterProfile[K])=>setDraft(p=>({...p,[key]:value}));
 const save=()=>saveProfile({...draft,name:draft.name.trim()||'My character',updatedAt:new Date().toISOString()});
 const routes=[...new Set(WAR_PLAN_NODES.map(x=>x.path))];
 function toggleNode(id:string){
  edit('warPlanNodes',draft.warPlanNodes.includes(id)?draft.warPlanNodes.filter(x=>x!==id):[...draft.warPlanNodes.filter(x=>!(id==='Total Chaos'&&x==='Reign in Hell'||id==='Reign in Hell'&&x==='Total Chaos')),id]);
 }
 return <div className="content">
  <div className="section-intro"><span className="eyebrow">01 / BEFORE YOU PLAY</span><h1>Strategy Lab</h1><p>Choose a profile once. Active War Plans and build characteristics are snapshotted at run start so results remain comparable later.</p></div>
  <section className="surface">
   <div className="section-header"><div><h2>Character</h2><p>Save multiple characters; your run automatically uses the active one.</p></div><span className="chip">{profiles.length} saved</span></div>
   {profiles.length>0&&<div className="profile-row" aria-label="Saved profiles">{profiles.map(p=><button key={p.id} onClick={()=>selectProfile(p.id)} className={'profile-chip '+(selectedProfile?.id===p.id?'selected':'')}>{p.className} · {p.name}</button>)}<button onClick={()=>setDraft(newProfile('New character','Paladin'))}>+ New</button></div>}
   <div className="form-grid">
    <label>Character name<input value={draft.name} onChange={e=>edit('name',e.target.value)} placeholder="e.g. Mass-clearing Paladin"/></label>
    <label>Class<select value={draft.className} onChange={e=>edit('className',e.target.value as CharacterProfile['className'])}>{GAME_CLASSES.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Build/archetype<input value={draft.buildName} onChange={e=>edit('buildName',e.target.value)} placeholder="e.g. Shield of Retribution"/></label>
    <label>Difficulty<select value={draft.difficulty} onChange={e=>edit('difficulty',e.target.value as CharacterProfile['difficulty'])}>{['Unknown','Torment I','Torment II','Torment III','Torment IV'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Game version<input value={draft.gamePatch} onChange={e=>edit('gamePatch',e.target.value)} placeholder="Patch or build number"/></label>
    <label>Build planner URL<input type="url" value={draft.buildUrl} onChange={e=>edit('buildUrl',e.target.value)} placeholder="https://maxroll.gg/d4/planner/…"/></label>
    <label>Elite / Lord clear speed<select value={draft.killSpeed} onChange={e=>edit('killSpeed',e.target.value as CharacterProfile['killSpeed'])}>{['unknown','fast','average','slow'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Mobility<select value={draft.mobility} onChange={e=>edit('mobility',e.target.value as CharacterProfile['mobility'])}>{['unknown','high','average','low'].map(x=><option key={x}>{x}</option>)}</select></label>
   </div>
   <p className="micro">Build URL is saved as a reference only. Importing and interpreting its items/paragon requires a separately validated adapter.</p>
   <div className="actions"><button className="primary" onClick={save}>Save character</button><button onClick={()=>setDraft(newProfile('New character','Paladin'))}>Create another profile</button></div>
  </section>
  <section className="surface">
   <div className="section-header"><div><h2>Infernal Hordes War Plan</h2><p>{WAR_PLAN_HOME}</p></div><span className="chip">S15 · verify in-game</span></div>
   <div className="special-switch"><label><input type="checkbox" checked={draft.specialOfferingAvailable} onChange={e=>edit('specialOfferingAvailable',e.target.checked)}/> One-use bonus offering available in this run</label><p>When spent, the special option is not available later. The optimizer must account for this opportunity cost.</p></div>
   {routes.map(route=><details key={route} className="node-group" open={route==='Offer control'?true:undefined}><summary>{route}</summary><div className="node-list">{WAR_PLAN_NODES.filter(n=>n.path===route).map(node=><label key={node.id} className="node-card"><input type="checkbox" checked={draft.warPlanNodes.includes(node.id)} onChange={()=>toggleNode(node.id)}/><span><b>{node.id}</b><small>{node.hint}</small></span></label>)}</div></details>)}
   <div className="actions"><button className="primary" onClick={save}>Save configuration</button></div>
  </section>
  <section className="surface launch">
   <div><h2>Ready to enter the Hordes?</h2><p>Save the profile and open a streamlined live-run recorder. You can skip optional observations during the run.</p></div>
   <div className="launch-actions"><label>Waves<select value={waves} onChange={e=>setWaves(Number(e.target.value))}>{[6,8,10].map(n=><option key={n}>{n}</option>)}</select></label><button className="primary" onClick={()=>{const p={...draft,name:draft.name.trim()||'My character',updatedAt:new Date().toISOString()};saveProfile(p);onStart(p,waves)}}>Start live run →</button></div>
  </section>
 </div>
}
