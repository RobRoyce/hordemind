import type {CharacterProfile} from '../../domain/schema';
import {toggleLairBossNode} from '../../domain/profile';
import {LAIR_BOSS_HOME,LAIR_BOSS_NODES} from '../../domain/splinters';
import {Checkbox,SectionHeading} from '../kit';
import s from './LairBossBlock.module.css';

interface Props{profile:CharacterProfile;onUpdate:(p:CharacterProfile)=>string|null}

export function LairBossBlock({profile,onUpdate}:Props){
 return <>
  <SectionHeading>Lair Bosses War Plan</SectionHeading>
  <p className={s.lead}>{LAIR_BOSS_HOME}. Only the nodes that change an Infernal Hordes run are listed.</p>
  <ul className={s.list}>
   {LAIR_BOSS_NODES.map(n=><li key={n.id} className={s.item}>
    <Checkbox label={n.id} checked={profile.lairBossNodes.includes(n.id)} onChange={()=>onUpdate(toggleLairBossNode(profile,n.id))}/>
    <p className={s.detail}>{n.where}. {n.effect} {n.aether==='none'?'No effect on Aether.':'Its effect on Chaos Wave Aether is unknown.'}</p>
   </li>)}
  </ul>
 </>;
}
