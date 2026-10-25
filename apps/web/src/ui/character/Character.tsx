import {useState} from 'react';
import {GAME_CLASSES,type CharacterProfile} from '../../domain/schema';
import {toggleWarPlanNode} from '../../domain/profile';
import {WAR_PLAN_HOME} from '../../domain/warplan';
import {Button,Field,NumberField,PageHeader,SectionHeading,Select,TextField} from '../kit';
import {CharacterForm,TIPS} from './CharacterForm';
import {CharacterTabs} from './CharacterTabs';
import {StartRunBar} from './StartRunBar';
import {WarPlanTree} from './WarPlanTree';
import s from './Character.module.css';

interface Props{
 profiles:CharacterProfile[];selectedProfile:CharacterProfile|null;
 /** Persists a change immediately; returns an error message when the change is rejected. */
 onUpdate:(p:CharacterProfile)=>string|null;
 onCreate:(name:string,className:CharacterProfile['className'])=>void;
 onSelect:(id:string)=>void;
 onStart:(p:CharacterProfile,waves:number)=>void;
}

export function Character({profiles,selectedProfile,onUpdate,onCreate,onSelect,onStart}:Props){
 return <div className={s.page}>
  <PageHeader title="Character" lead="Changes save as you make them. Each run keeps a copy of the setup it started with."/>
  {profiles.length>0&&<CharacterTabs profiles={profiles} current={selectedProfile?.id??null} onSelect={onSelect} onCreate={()=>onCreate('New character','Paladin')}/>}
  {selectedProfile?<Editor key={selectedProfile.id} profile={selectedProfile} onUpdate={onUpdate} onStart={onStart}/>:<CreateFirst onCreate={onCreate}/>}
 </div>;
}

function CreateFirst({onCreate}:Pick<Props,'onCreate'>){
 const [name,setName]=useState('');
 const [className,setClassName]=useState<CharacterProfile['className']>('Paladin');
 return <form className={s.section} onSubmit={e=>{e.preventDefault();onCreate(name.trim()||'My character',className)}}>
  <SectionHeading>Create your character</SectionHeading>
  <div className={s.pair}>
   <Field label="Character name" help={TIPS.name}>
    {w=><TextField wire={w} value={name} maxLength={80} placeholder="e.g. Blessed Shield Paladin" onChange={e=>setName(e.target.value)}/>}
   </Field>
   <Field label="Class" help={TIPS.class}>
    {w=><Select wire={w} value={className} onChange={e=>setClassName(e.target.value as CharacterProfile['className'])}>{GAME_CLASSES.map(x=><option key={x}>{x}</option>)}</Select>}
   </Field>
  </div>
  <div><Button variant="primary" type="submit">Create character</Button></div>
 </form>;
}

function Editor({profile,onUpdate,onStart}:{profile:CharacterProfile}&Pick<Props,'onUpdate'|'onStart'>){
 const update=(patch:Partial<CharacterProfile>)=>onUpdate({...profile,...patch});
 return <>
  <CharacterForm profile={profile} onUpdate={onUpdate}/>
  <section className={s.section} aria-label="War Plan setup">
   <SectionHeading>Infernal Hordes War Plan</SectionHeading>
   <p className={s.lead}>{WAR_PLAN_HOME}. Learn the same upgrades you have in game.</p>
   <WarPlanTree learned={profile.warPlanNodes} onToggle={id=>onUpdate(toggleWarPlanNode(profile,id))}>
    <div className={s.splinter}>
     <Field label="Splinter of Terror rank" help={TIPS.splinter}>
      {w=><NumberField wire={w} min={0} max={20} placeholder="Not set" value={profile.splinterRank??''}
       onChange={e=>{const v=e.target.value===''?null:Math.max(0,Math.min(20,Math.round(Number(e.target.value))));if(v===null||Number.isFinite(v))update({splinterRank:v})}}/>}
     </Field>
    </div>
   </WarPlanTree>
  </section>
  <section className={s.section} aria-label="Start a run">
   <StartRunBar onStart={waves=>onStart(profile,waves)}/>
  </section>
 </>;
}
