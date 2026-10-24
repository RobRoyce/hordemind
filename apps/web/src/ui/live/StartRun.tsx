import {useState} from 'react';
import {COMPASSES} from '../../catalog';
import type {CharacterProfile} from '../../domain/schema';
import {Button,PageHeader,Segmented} from '../kit';
import {CharacterSummary} from './RunHeader';
import s from './StartRun.module.css';

const WAVE_OPTIONS=COMPASSES.map(([n,name])=>({value:String(n),label:`${n} ${name.replace(/ compass$/,'')}`}));

interface Props{profile:CharacterProfile|null;onStart:(profile:CharacterProfile,waves:number)=>void;onGoCharacter:()=>void}

export function StartRun({profile,onStart,onGoCharacter}:Props){
 const [waves,setWaves]=useState('10');
 return <div className={s.start}>
  <PageHeader title="Live Run" lead="Enter the offers on your screen before each wave, and HordeMind ranks them. Your setup comes from Character."/>
  {!profile?<section className={s.section}>
   <h2 className={s.heading}>Set up a character first</h2>
   <p className={s.text}>HordeMind needs your class, difficulty and War Plans to compare offers.</p>
   <div><Button variant="primary" onClick={onGoCharacter}>Set up a character</Button></div>
  </section>:<section className={s.section}>
   <h2 className={s.heading}>{profile.name}</h2>
   <CharacterSummary profile={profile}/>
   <div className={s.waves}>
    <span className={s.caption} aria-hidden="true">Waves</span>
    <Segmented label="Waves" value={waves} options={WAVE_OPTIONS} onChange={setWaves}/>
   </div>
   <div className={s.actions}>
    <Button variant="primary" onClick={()=>onStart(profile,Number(waves))}>Start a {waves}-wave run</Button>
    <Button variant="text" onClick={onGoCharacter}>Edit character</Button>
   </div>
  </section>}
 </div>;
}
