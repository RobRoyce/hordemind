import {strandedLairBoss} from '../../domain/lairBossPlan';
import {toggleLairBossNode} from '../../domain/profile';
import type {CharacterProfile} from '../../domain/schema';
import {LAIR_BOSS_HOME,LAIR_BOSS_NODES} from '../../domain/splinters';
import {LB_GRAPH,ROOT,neighbors} from '../../domain/warPlans';
import {SectionHeading} from '../kit';
import {PlanDetail,PlanTree} from './PlanTree';
import {lairBossGraphNodes,lairBossState} from './lairBossView';
import c from './Character.module.css';

interface Props{profile:CharacterProfile;onUpdate:(p:CharacterProfile)=>string|null}

const NODES=lairBossGraphNodes();
const PLACE=new Map(LB_GRAPH.nodes.map(n=>[n.name,n]));
const HORDES=new Map(LAIR_BOSS_NODES.map(n=>[n.id,n]));

function Detail({id,learned}:{id:string;learned:readonly string[]}){
 const n=PLACE.get(id);
 if(!n)return null;
 const h=HORDES.get(id);
 const st=lairBossState(learned,id);
 return <PlanDetail name={id} tooltip={n.tooltip} note={n.seasonal||undefined}
  use={h?`${h.effect} ${h.aether==='none'?'No effect on Aether.':'Its effect on Chaos Wave Aether is unknown.'}`:"It doesn't change an Infernal Hordes run, so HordeMind doesn't use it."}
  status={st==='learned'?'Learned.':st==='open'?'Available to learn.':`Locked: learn ${neighbors(LB_GRAPH,id).filter(x=>x!==ROOT).join(' or ')} first.`}/>;
}

/** The whole Lair Bosses War Plan, drawn in the game's layout. Only the six ◆ Hordes upgrades change a run. */
export function LairBossTree({profile,onUpdate}:Props){
 const learned=profile.lairBossNodes;
 return <>
  <SectionHeading>Lair Bosses War Plan</SectionHeading>
  <p className={c.lead}>{LAIR_BOSS_HOME}. Learn the same upgrades you have in game. Upgrades marked ◆ change an Infernal Hordes run.</p>
  <PlanTree label="Lair Bosses War Plan" nodes={NODES} edges={LB_GRAPH.edges} state={id=>lairBossState(learned,id)}
   onToggle={id=>onUpdate(toggleLairBossNode(profile,id))} detail={id=><Detail id={id} learned={learned}/>} stranded={strandedLairBoss(learned)}/>
 </>;
}
