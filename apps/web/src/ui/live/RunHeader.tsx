import {resolveOffer} from '../../catalog';
import type {CharacterProfile} from '../../domain/schema';
import {Button,CategoryMark,Disclosure,Numeral,WaveTrack} from '../kit';
import s from './RunHeader.module.css';

export function CharacterSummary({profile}:{profile:CharacterProfile}){
 return <dl className={s.summary} aria-label="Character summary">
  <div><dt>Class</dt><dd>{profile.className}</dd></div>
  <div><dt>Difficulty</dt><dd>{profile.difficulty}</dd></div>
  <div><dt>Realm</dt><dd>{profile.realm}</dd></div>
  <div><dt>Build</dt><dd>{profile.buildName||'Not named'}</dd></div>
  <div><dt>Clear speed</dt><dd>{profile.killSpeed}</dd></div>
  <div><dt>Mobility</dt><dd>{profile.mobility}</dd></div>
  <div className={s.wide}><dt>War Plans</dt><dd>{profile.warPlanNodes.length?profile.warPlanNodes.join(', '):'None selected'}</dd></div>
 </dl>;
}

export interface TakenOffer{id:string;offer:string;pact:boolean}

interface Props{
 /** The profile saved when the run started. */
 profile:CharacterProfile;
 wave:number;totalWaves:number;deciding:boolean;
 aether:number|null;
 /** The wave the latest Aether reading followed. */
 observedWave:number|null;
 taken:readonly TakenOffer[];
 /** "Black Pact unused" and the like, when the run's War Plan has the Pact. */
 pactStatus:string|null;
 onEditCharacter:()=>void;
}

export function RunHeader({profile,wave,totalWaves,deciding,aether,observedWave,taken,pactStatus,onEditCharacter}:Props){
 return <header className={s.header}>
  <p className={s.who}><strong>{profile.name}</strong> <span>{[profile.className,profile.difficulty,profile.realm].join(', ')}</span></p>
  <Disclosure summary="Run setup">
   <CharacterSummary profile={profile}/>
   <p className={s.note}>Saved when this run started. Editing your character changes future runs only.</p>
   <Button variant="text" onClick={onEditCharacter}>Edit character</Button>
  </Disclosure>
  <div className={s.numbers} aria-live="polite">
   <Numeral label={deciding?'Before wave':'Wave'} value={wave} of={totalWaves}/>
   <Numeral label="Aether" value={aether} tone="ember" {...(observedWave!==null?{note:`after wave ${observedWave}`}:{})}/>
  </div>
  <WaveTrack total={totalWaves} taken={taken.map(t=>t.offer)} deciding={deciding}/>
  {(taken.length>0||pactStatus)&&<div className={s.taken}>
   {taken.length>0&&<ul className={s.takenList} aria-label="Offers taken">
    {taken.map(t=><li key={t.id}>
     <CategoryMark family={resolveOffer(t.offer)?.family??null} label={t.offer}/>
     {t.pact&&<span className={s.muted}> (Black Pact)</span>}
    </li>)}
   </ul>}
   {pactStatus&&<span className={s.muted}>{pactStatus}</span>}
  </div>}
 </header>;
}
