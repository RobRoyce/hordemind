import {useState} from 'react';
import {GAME_CLASSES,DIFFICULTIES,REALMS,type CharacterProfile} from '../domain/schema';
import {normalizeBuildUrl,toggleWarPlanNode,SPECIAL_OFFER_NODE} from '../domain/profile';
import {COMPASSES,WAR_PLAN_NODES,WAR_PLAN_HOME} from '../catalog';
import {Help} from './Help';

interface Props{
 profiles:CharacterProfile[];selectedProfile:CharacterProfile|null;
 /** Persists a change immediately; returns an error message when the change is rejected. */
 onUpdate:(p:CharacterProfile)=>string|null;
 onCreate:(name:string,className:CharacterProfile['className'])=>void;
 onSelect:(id:string)=>void;
 onStart:(p:CharacterProfile,waves:number)=>void;
}
const TIPS={
 name:'A label for this character. Keep separate profiles for different builds.',
 class:'The class you are playing.',
 archetype:'A short description of the build. Saved for your reference; it does not change recommendations yet.',
 difficulty:'The world difficulty you run Infernal Hordes on, from Normal up to Torment XII.',
 realm:'Season 15 or Eternal. This is the realm you play on, separate from the game patch the data is tagged with.',
 url:'A link to your build in a planner such as Maxroll, D4Builds or Icy Veins. Saved as a bookmark only: it does not import gear or skills or affect recommendations.',
 kill:'How long a major target such as an Aether Lord takes at this difficulty. Fast: nearly instant. Average: a few seconds. Slow: long enough to cost you other events. The simulator gives faster builds more event time per wave.',
 mobility:'How quickly you reach events spread across the arena, not your movement-speed stat. High: distant events are almost instant. Low: crossing the arena takes real time. The simulator scales available event time by this.'
} as const;
const KILL_HINT={fast:'Lords and elites die almost instantly',average:'Several seconds per major target',slow:'Major targets cost noticeable wave time',unknown:'Treated as average'} as const;
const MOBILITY_HINT={high:'Distant events are almost instant',average:'Some travel between events',low:'Crossing the arena takes real time',unknown:'Treated as average'} as const;
const SPEED_OPTIONS=[['unknown','Not sure'],['fast','Fast'],['average','Average'],['slow','Slow']] as const;
const MOBILITY_OPTIONS=[['unknown','Not sure'],['high','High'],['average','Average'],['low','Low']] as const;

const Label=({text,tip}:{text:string;tip:string})=><span className="field-label">{text} <Help message={tip}/></span>;

export function StrategyLab({profiles,selectedProfile,onUpdate,onCreate,onSelect,onStart}:Props){
 return <div className="content">
  <div className="section-intro"><h1>Strategy Lab</h1><p>Set up your character once. Changes save as you make them, and each run keeps a copy of the setup it started with.</p></div>
  {profiles.length>0&&<div className="profile-row" role="group" aria-label="Saved characters">
   {profiles.map(p=><button key={p.id} onClick={()=>onSelect(p.id)} aria-pressed={selectedProfile?.id===p.id} className="profile-chip">{p.name} <small>{p.className}</small></button>)}
   <button className="profile-chip add" onClick={()=>onCreate('New character','Paladin')}>New character</button>
  </div>}
  {selectedProfile?<ProfileEditor key={selectedProfile.id} profile={selectedProfile} onUpdate={onUpdate} onStart={onStart}/>:<CreateFirst onCreate={onCreate}/>}
 </div>;
}

function CreateFirst({onCreate}:Pick<Props,'onCreate'>){
 const [name,setName]=useState('');
 const [className,setClassName]=useState<CharacterProfile['className']>('Paladin');
 return <form className="surface create-first" onSubmit={e=>{e.preventDefault();onCreate(name.trim()||'My character',className)}}>
  <h2>Create your character</h2>
  <div className="form-grid">
   <label><Label text="Character name" tip={TIPS.name}/><input aria-label="Character name" value={name} maxLength={80} onChange={e=>setName(e.target.value)} placeholder="e.g. Blessed Shield Paladin"/></label>
   <label><Label text="Class" tip={TIPS.class}/><select aria-label="Class" value={className} onChange={e=>setClassName(e.target.value as CharacterProfile['className'])}>{GAME_CLASSES.map(x=><option key={x}>{x}</option>)}</select></label>
  </div>
  <div className="actions"><button className="primary" type="submit">Create character</button></div>
 </form>;
}

function ProfileEditor({profile,onUpdate,onStart}:{profile:CharacterProfile}&Pick<Props,'onUpdate'|'onStart'>){
 const [name,setName]=useState(profile.name);
 const [url,setUrl]=useState(profile.buildUrl);
 const [urlError,setUrlError]=useState('');
 const [waves,setWaves]=useState(10);
 const update=(patch:Partial<CharacterProfile>)=>onUpdate({...profile,...patch});
 const routes=[...new Set(WAR_PLAN_NODES.map(x=>x.path))];

 function editName(text:string){
  setName(text);
  if(text.trim())update({name:text.trim()});
 }
 function editUrl(text:string){
  setUrl(text);
  const result=normalizeBuildUrl(text);
  if('error' in result){setUrlError(result.error);return}
  setUrlError('');
  if(result.value!==profile.buildUrl)update({buildUrl:result.value});
 }

 return <>
  <section className="surface" aria-labelledby="character-title">
   <div className="section-header"><h2 id="character-title">Character</h2><span className="chip">Saved on this device</span></div>
   <div className="form-grid">
    <label><Label text="Character name" tip={TIPS.name}/><input aria-label="Character name" value={name} maxLength={80} onChange={e=>editName(e.target.value)} onBlur={()=>{if(!name.trim())setName(profile.name)}}/></label>
    <label><Label text="Class" tip={TIPS.class}/><select aria-label="Class" value={profile.className} onChange={e=>update({className:e.target.value as CharacterProfile['className']})}>{GAME_CLASSES.map(x=><option key={x}>{x}</option>)}</select></label>
    <label><Label text="Build" tip={TIPS.archetype}/><input aria-label="Build" value={profile.buildName} maxLength={100} onChange={e=>update({buildName:e.target.value})} placeholder="e.g. Blessed Shield"/></label>
    <label><Label text="Difficulty" tip={TIPS.difficulty}/><select aria-label="Difficulty" value={profile.difficulty} onChange={e=>update({difficulty:e.target.value as CharacterProfile['difficulty']})}>{DIFFICULTIES.map(x=><option key={x} value={x}>{x==='Unknown'?'Not set':x}</option>)}</select></label>
    <label><Label text="Realm" tip={TIPS.realm}/><select aria-label="Realm" value={profile.realm} onChange={e=>{const realm=e.target.value as CharacterProfile['realm'];update({realm,gamePatch:realm==='Eternal'?'Eternal-unverified':'S15-unverified'})}}>{REALMS.map(x=><option key={x}>{x}</option>)}</select></label>
    <label><Label text="Build planner link" tip={TIPS.url}/>
     <input aria-label="Build planner link" inputMode="url" value={url} onChange={e=>editUrl(e.target.value)} placeholder="maxroll.gg/d4/planner/…"
      aria-invalid={urlError?true:undefined} aria-describedby={urlError?'url-error':undefined}/>
     {urlError?<span className="field-error" id="url-error">{urlError}. The last valid link is still saved.</span>:
      profile.buildUrl&&<a className="field-choice-hint" href={profile.buildUrl} target="_blank" rel="noreferrer">Open saved link ↗</a>}
    </label>
    <label><Label text="Elite / Lord clear speed" tip={TIPS.kill}/><select aria-label="Elite / Lord clear speed" value={profile.killSpeed} onChange={e=>update({killSpeed:e.target.value as CharacterProfile['killSpeed']})}>{SPEED_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><span className="field-choice-hint">{KILL_HINT[profile.killSpeed]}</span></label>
    <label><Label text="Mobility" tip={TIPS.mobility}/><select aria-label="Mobility" value={profile.mobility} onChange={e=>update({mobility:e.target.value as CharacterProfile['mobility']})}>{MOBILITY_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><span className="field-choice-hint">{MOBILITY_HINT[profile.mobility]}</span></label>
   </div>
  </section>
  <section className="surface" aria-labelledby="warplan-title">
   <div className="section-header"><div><h2 id="warplan-title">Infernal Hordes War Plan</h2><p>{WAR_PLAN_HOME}. Node names follow community guides; check them against your in-game tree.</p></div></div>
   {routes.map(route=><fieldset key={route} className="node-group"><legend>{route}</legend><div className="node-list">
    {WAR_PLAN_NODES.filter(n=>n.path===route).map(node=><label key={node.id} className="node-card">
     <input type="checkbox" checked={profile.warPlanNodes.includes(node.id)} onChange={()=>onUpdate(toggleWarPlanNode(profile,node.id))}/>
     <span><b>{node.id}</b><small>{node.hint}</small>
      {node.id===SPECIAL_OFFER_NODE&&<small className="node-note">Adds one extra offer that synergizes with your most recent pick. You can take it instead of the regular offers; once taken it does not come back. Live Run lets you mark it.</small>}
     </span>
    </label>)}
   </div></fieldset>)}
  </section>
  <section className="surface launch">
   <div><h2>Ready for the Hordes?</h2><p>Start a run with this character. You'll enter each wave's offers and get a recommendation.</p></div>
   <div className="launch-actions">
    <label>Waves<select value={waves} onChange={e=>setWaves(Number(e.target.value))}>{COMPASSES.map(([n,name])=><option key={n} value={n}>{n} · {name}</option>)}</select></label>
    <button className="primary" onClick={()=>onStart(profile,waves)}>Start live run</button>
   </div>
  </section>
 </>;
}
