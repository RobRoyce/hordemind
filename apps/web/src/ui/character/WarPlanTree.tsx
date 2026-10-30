import {WAR_PLAN_POINTS,nodeById,pointsUsed,unsupported} from '../../domain/warplan';
import {cx} from '../kit';
import {PlanDetail,PlanTree} from './PlanTree';
import {WAR_PLAN_EDGES,nodeState,warPlanGraphNodes} from './warPlanView';
import s from './WarPlanTree.module.css';

interface Props{
 learned:readonly string[];
 onToggle:(id:string)=>void;
}

export function WarPlanDetail({id,learned}:{id:string;learned:readonly string[]}){
 const n=nodeById(id);
 if(!n)return null;
 return <PlanDetail name={n.id} tooltip={n.tooltip} note={n.exclusive&&`Choose one: learning it replaces ${n.exclusive}.`} use={n.use} status={{
  learned:'Learned.',
  open:'Available to learn.',
  excluded:`Excluded while ${n.exclusive} is learned. Learning it swaps them.`,
  locked:`Locked: learn ${n.parents.join(' or ')} first.`
 }[nodeState(learned,n.id)]}/>;
}

const NODES=warPlanGraphNodes();

/** The whole Infernal Hordes War Plan, drawn in the game's layout, with its points counter. */
export function WarPlanTree({learned,onToggle}:Props){
 const counted=pointsUsed(learned);
 const over=counted>WAR_PLAN_POINTS;

 return <div className={s.tree}>
  <p className={cx(s.counter,over&&s.over)}>
   <span className={s.count}>{counted}</span> {counted===1?'upgrade':'upgrades'} learned. The game allows {WAR_PLAN_POINTS} points across all branches.{over&&' Check your tree.'}
  </p>
  <PlanTree label="Infernal Hordes War Plan" nodes={NODES} edges={WAR_PLAN_EDGES} state={id=>nodeState(learned,id)} onToggle={onToggle}
   detail={id=><WarPlanDetail id={id} learned={learned}/>} stranded={unsupported(learned)} exclusive/>
 </div>;
}
