import type {CharacterProfile} from '../../domain/schema';
import {StartRunBar} from '../character/StartRunBar';
import {Button,PageHeader} from '../kit';
import {CharacterSummary} from './RunHeader';
import s from './StartRun.module.css';

interface Props{profile:CharacterProfile|null;onStart:(profile:CharacterProfile,waves:number)=>void;onGoCharacter:()=>void}

export function StartRun({profile,onStart,onGoCharacter}:Props){
 return <div className={s.start}>
  <PageHeader title="Live Run" lead="Enter the offers on your screen before each wave, and HordeMind ranks them. Your setup comes from Character."/>
  {!profile?<section className={s.section}>
   <h2 className={s.heading}>Set up a character first</h2>
   <p className={s.text}>HordeMind needs your class, difficulty and War Plans to compare offers.</p>
   <div><Button variant="primary" onClick={onGoCharacter}>Set up a character</Button></div>
  </section>:<section className={s.section}>
   <h2 className={s.heading}>{profile.name}</h2>
   <CharacterSummary profile={profile}/>
   <StartRunBar onStart={waves=>onStart(profile,waves)}/>
   <div><Button variant="text" onClick={onGoCharacter}>Edit character</Button></div>
  </section>}
 </div>;
}
