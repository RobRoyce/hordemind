import {useState} from 'react';
import {DIFFICULTIES,GAME_CLASSES,REALMS,type CharacterProfile} from '../../domain/schema';
import {normalizeBuildUrl} from '../../domain/profile';
import {Field,Segmented,Select,TextField} from '../kit';
import {SplinterBlock} from './SplinterBlock';
import s from './CharacterForm.module.css';

export const TIPS={
 name:'A label for this character. Keep separate profiles for different builds.',
 class:'The class you are playing.',
 archetype:'A short description of the build. Saved for your reference; it does not change recommendations yet.',
 difficulty:'The world difficulty you run Infernal Hordes on, from Normal up to Torment XII.',
 realm:'Season 15 or Eternal. This is the realm you play on, separate from the game patch the data is tagged with.',
 url:'A link to your build in a planner such as Maxroll, D4Builds or Icy Veins. Saved as a bookmark only: it does not import gear or skills or affect recommendations.',
 kill:'How long a major target such as an Aether Lord takes at this difficulty. Fast: nearly instant. Average: a few seconds. Slow: long enough to cost you other events. The simulator gives faster builds more event time per wave.',
 splinter:"Pick the Season 15 splinter you have active and enter its rank, from 0 to 24. Each splinter keeps its own saved rank. Only the active splinter's War Plan bonuses apply.",
 mobility:'How quickly you reach events spread across the arena, not your movement-speed stat. High: distant events are almost instant. Low: crossing the arena takes real time. The simulator scales available event time by this.'
} as const;
const KILL_HINT={fast:'Lords and elites die almost instantly',average:'Several seconds per major target',slow:'Major targets cost noticeable wave time',unknown:'Treated as average'} as const;
const MOBILITY_HINT={high:'Distant events are almost instant',average:'Some travel between events',low:'Crossing the arena takes real time',unknown:'Treated as average'} as const;
const SPEED_OPTIONS=[{value:'unknown',label:'Not sure'},{value:'fast',label:'Fast'},{value:'average',label:'Average'},{value:'slow',label:'Slow'}] as const;
const MOBILITY_OPTIONS=[{value:'unknown',label:'Not sure'},{value:'high',label:'High'},{value:'average',label:'Average'},{value:'low',label:'Low'}] as const;
const REALM_OPTIONS=REALMS.map(r=>({value:r,label:r}));

interface Props{
 profile:CharacterProfile;
 /** Persists a change immediately; returns an error message when the change is rejected. */
 onUpdate:(p:CharacterProfile)=>string|null;
}

export function CharacterForm({profile,onUpdate}:Props){
 const [name,setName]=useState(profile.name);
 const [url,setUrl]=useState(profile.buildUrl);
 const [urlError,setUrlError]=useState('');
 const update=(patch:Partial<CharacterProfile>)=>onUpdate({...profile,...patch});

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

 return <div className={s.form}>
  <Field label="Character name" help={TIPS.name}>
   {w=><TextField wire={w} value={name} maxLength={80} onChange={e=>editName(e.target.value)} onBlur={()=>{if(!name.trim())setName(profile.name)}}/>}
  </Field>
  <Field label="Class" help={TIPS.class}>
   {w=><Select wire={w} value={profile.className} onChange={e=>update({className:e.target.value as CharacterProfile['className']})}>
    {GAME_CLASSES.map(x=><option key={x}>{x}</option>)}
   </Select>}
  </Field>
  <Field label="Build" help={TIPS.archetype}>
   {w=><TextField wire={w} value={profile.buildName} maxLength={100} placeholder="e.g. Blessed Shield" onChange={e=>update({buildName:e.target.value})}/>}
  </Field>
  <div className={s.stack}>
   <Field label="Build planner link" help={TIPS.url} {...(urlError?{error:`${urlError}. The last valid link is still saved.`}:{})}>
    {w=><TextField wire={w} inputMode="url" value={url} placeholder="maxroll.gg/d4/planner/…" onChange={e=>editUrl(e.target.value)}/>}
   </Field>
   {!urlError&&profile.buildUrl&&<a className={s.saved} href={profile.buildUrl} target="_blank" rel="noreferrer">Open saved link</a>}
  </div>
  <Field label="Difficulty" help={TIPS.difficulty}>
   {w=><Select wire={w} value={profile.difficulty} onChange={e=>update({difficulty:e.target.value as CharacterProfile['difficulty']})}>
    {DIFFICULTIES.map(x=><option key={x} value={x}>{x==='Unknown'?'Not set':x}</option>)}
   </Select>}
  </Field>
  <Field label="Realm" help={TIPS.realm} group>
   {w=><Segmented label="Realm" value={profile.realm} options={REALM_OPTIONS} describedBy={w.describedBy}
    onChange={realm=>update({realm,gamePatch:realm==='Eternal'?'Eternal-unverified':'S15-unverified'})}/>}
  </Field>
  <Field label="Elite and Lord clear speed" help={TIPS.kill} hint={KILL_HINT[profile.killSpeed]} group>
   {w=><Segmented label="Elite and Lord clear speed" value={profile.killSpeed} options={SPEED_OPTIONS} describedBy={w.describedBy}
    onChange={killSpeed=>update({killSpeed})}/>}
  </Field>
  <Field label="Mobility" help={TIPS.mobility} hint={MOBILITY_HINT[profile.mobility]} group>
   {w=><Segmented label="Mobility" value={profile.mobility} options={MOBILITY_OPTIONS} describedBy={w.describedBy}
    onChange={mobility=>update({mobility})}/>}
  </Field>
  <SplinterBlock profile={profile} onUpdate={update} help={TIPS.splinter}/>
 </div>;
}
