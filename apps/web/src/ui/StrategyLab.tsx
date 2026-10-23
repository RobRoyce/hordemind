import {useEffect,useState} from 'react';
import {GAME_CLASSES,DIFFICULTIES,REALMS,type CharacterProfile} from '../domain/schema';
import {Help} from './Help';
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
 const tips={
  name:'A label for this saved character. You can have separate profiles for different builds.',
  class:'The character class you are playing. Different classes affect clear speed and event throughput.',
  archetype:'Optional shorthand for the build or skills you use. This is descriptive, not automatically analyzed yet.',
  difficulty:'The in-game world difficulty. Includes Normal through Torment XII (T12). Pick the tier actually selected in game.',
  realm:'Season 15 or Eternal. This is the realm you are playing on, not a software build number; patch version remains separate internally.',
  url:'Optional link to a build planner (Maxroll, D4Builds, Icy Veins, etc.). Today it is only a bookmark/reference. It does NOT import stats, skills, items or affect recommendations. Build import is planned.',
  kill:'How quickly you usually kill an Aether Lord / elite on this difficulty. Fast: nearly instant; average: a few seconds; slow: substantial time or danger. Event throughput matters more than paper DPS.',
  mobility:'How easily you travel between Masses, Spires and encounters. High: reach distant events almost instantly; average: some travel delay; low: significant time crossing the arena. Choose based on how you actually play, not movement-speed stat alone.',
  bonus:'If a War Plan grants a one-use special offer, mark it here. Choosing that special slot consumes its future opportunity.',
 } as const;
 const labelWithHelp=(label:string,msg:string)=><span className="field-label">{label} <Help message={msg}/></span>;
 const mobilityHint={high:'High — near-instant access to distant events',average:'Average — modest arena traversal delay',low:'Low — significant time moving between objectives',unknown:'Unknown — not measured'}[draft.mobility];
 const killHint={fast:'Fast — Lords/elites die almost instantly',average:'Average — several seconds per major target',slow:'Slow — major targets meaningfully reduce event throughput',unknown:'Unknown — not measured'}[draft.killSpeed];
 function toggleNode(id:string){
  edit('warPlanNodes',draft.warPlanNodes.includes(id)?draft.warPlanNodes.filter(x=>x!==id):[...draft.warPlanNodes.filter(x=>!(id==='Total Chaos'&&x==='Reign in Hell'||id==='Reign in Hell'&&x==='Total Chaos')),id]);
 }
 return <div className="content">
  <div className="section-intro"><span className="eyebrow">01 / BEFORE YOU PLAY</span><h1>Strategy Lab</h1><p>Choose a profile once. Active War Plans and build characteristics are snapshotted at run start so results remain comparable later.</p></div>
  <section className="surface">
   <div className="section-header"><div><h2>Character</h2><p>Save multiple characters; your run automatically uses the active one. Switching views does not clear this setup.</p></div><span className="chip">{profiles.length} saved</span></div>
   {profiles.length>0&&<div className="profile-row" aria-label="Saved profiles">{profiles.map(p=><button key={p.id} onClick={()=>selectProfile(p.id)} className={'profile-chip '+(selectedProfile?.id===p.id?'selected':'')}>{p.className} · {p.name}</button>)}<button onClick={()=>setDraft(newProfile('New character','Paladin'))}>+ New</button></div>}
   <div className="form-grid">
    <label>{labelWithHelp('Character name',tips.name)}<input aria-label="Character name" value={draft.name} onChange={e=>edit('name',e.target.value)} placeholder="e.g. Mass-clearing Paladin"/></label>
    <label>{labelWithHelp('Class',tips.class)}<select aria-label="Class" value={draft.className} onChange={e=>edit('className',e.target.value as CharacterProfile['className'])}>{GAME_CLASSES.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>{labelWithHelp('Build / archetype',tips.archetype)}<input aria-label="Build / archetype" value={draft.buildName} onChange={e=>edit('buildName',e.target.value)} placeholder="e.g. Shield of Retribution"/></label>
    <label>{labelWithHelp('Difficulty',tips.difficulty)}<select aria-label="Difficulty" value={draft.difficulty} onChange={e=>edit('difficulty',e.target.value as CharacterProfile['difficulty'])}>{DIFFICULTIES.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label>{labelWithHelp('Realm / game mode',tips.realm)}<select aria-label="Realm / game mode" value={draft.realm} onChange={e=>setDraft(p=>({...p,realm:e.target.value as CharacterProfile['realm'],gamePatch:e.target.value==='Eternal'?'Eternal-unverified':'S15-unverified'}))}>{REALMS.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>{labelWithHelp('Build planner URL',tips.url)}<input aria-label="Build planner URL" type="url" value={draft.buildUrl} onChange={e=>edit('buildUrl',e.target.value)} placeholder="https://maxroll.gg/d4/planner/…"/></label>
    <label>{labelWithHelp('Elite / Lord clear speed',tips.kill)}<select aria-label="Elite / Lord clear speed" value={draft.killSpeed} onChange={e=>edit('killSpeed',e.target.value as CharacterProfile['killSpeed'])}>{['unknown','fast','average','slow'].map(x=><option key={x}>{x}</option>)}</select><span className="field-choice-hint">{killHint}</span></label>
    <label>{labelWithHelp('Mobility',tips.mobility)}<select aria-label="Mobility" value={draft.mobility} onChange={e=>edit('mobility',e.target.value as CharacterProfile['mobility'])}>{['unknown','high','average','low'].map(x=><option key={x}>{x}</option>)}</select><span className="field-choice-hint">{mobilityHint}</span></label>
   </div>
   <p className="micro"><b>Build URL:</b> only saved as a reference for now. It does not import or overwrite your configuration. Hover or focus the question-mark icons for the meaning of each field.</p>
   <div className="actions"><button className="primary" onClick={save}>Save character</button><button onClick={()=>setDraft(newProfile('New character','Paladin'))}>Create another profile</button></div>
  </section>
  <section className="surface">
   <div className="section-header"><div><h2>Infernal Hordes War Plan</h2><p>{WAR_PLAN_HOME}</p></div><span className="chip">S15 · verify in-game</span></div>
   <div className="special-switch"><label><input type="checkbox" checked={draft.specialOfferingAvailable} onChange={e=>edit('specialOfferingAvailable',e.target.checked)}/> One-use bonus offering available in this run <Help message={tips.bonus}/></label><p>When spent, the special option is not available later. The optimizer must account for this opportunity cost.</p></div>
   {routes.map(route=><details key={route} className="node-group" open={route==='Offer control'?true:undefined}><summary>{route}</summary><div className="node-list">{WAR_PLAN_NODES.filter(n=>n.path===route).map(node=><label key={node.id} className="node-card"><input type="checkbox" checked={draft.warPlanNodes.includes(node.id)} onChange={()=>toggleNode(node.id)}/><span><b>{node.id}</b><small>{node.hint}</small></span></label>)}</div></details>)}
   <div className="actions"><button className="primary" onClick={save}>Save configuration</button></div>
  </section>
  <section className="surface launch">
   <div><h2>Ready to enter the Hordes?</h2><p>Save the profile and open a streamlined live-run recorder. You can skip optional observations during the run.</p></div>
   <div className="launch-actions"><label>Waves<select value={waves} onChange={e=>setWaves(Number(e.target.value))}>{[6,8,10].map(n=><option key={n}>{n}</option>)}</select></label><button className="primary" onClick={()=>{const p={...draft,name:draft.name.trim()||'My character',updatedAt:new Date().toISOString()};saveProfile(p);onStart(p,waves)}}>Start live run →</button></div>
  </section>
 </div>
}
