import {useId,useState} from 'react';
import {WAR_PLAN_POINTS,nodeById,unsupported} from '../../domain/warplan';
import {DiamondGraph,Notice,cx} from '../kit';
import {wrongInfoUrl} from '../report';
import {WAR_PLAN_EDGES,countedUpgrades,nodeState,warPlanGraphNodes} from './warPlanView';
import s from './WarPlanTree.module.css';

interface Props{
 learned:readonly string[];
 onToggle:(id:string)=>void;
}

function Detail({id,shown,learned}:{id:string;shown:string|null;learned:readonly string[]}){
 const n=shown?nodeById(shown):null;
 // Not a live region: each node's aria-describedby already reads these details on focus.
 return <div id={id} className={s.detail} role="region" aria-label="Upgrade details">
  {!n?<p className={s.muted}>Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it.</p>:<>
   <h4 className={s.detailName}>{n.id}</h4>
   <p className={s.tooltip}>{n.tooltip}</p>
   {n.exclusive&&<p className={s.muted}>Choose one: learning it replaces {n.exclusive}.</p>}
   <p><b>In HordeMind:</b> {n.use}</p>
   <p className={s.muted}>{{
    learned:'Learned.',
    open:'Available to learn.',
    excluded:`Excluded while ${n.exclusive} is learned. Click to swap it in.`,
    locked:`Locked: learn ${n.parents.join(' or ')} first.`
   }[nodeState(learned,n.id)]}</p>
   <a className={s.report} href={wrongInfoUrl(n.id,`Tooltip: ${n.tooltip}\nIn HordeMind: ${n.use}`)} target="_blank" rel="noreferrer">Tooltip or effect wrong? Report it</a>
  </>}
 </div>;
}

const NODES=warPlanGraphNodes();

/** The whole Infernal Hordes War Plan, drawn in the game's layout. */
export function WarPlanTree({learned,onToggle}:Props){
 const detailId=useId();
 const [shown,setShown]=useState<string|null>(null);
 const counted=countedUpgrades(learned);
 const over=counted>WAR_PLAN_POINTS;
 const stranded=unsupported(learned);
 const them=stranded.length===1?'it':'them';

 return <div className={s.tree}>
  <div className={s.top}>
   <p className={cx(s.counter,over&&s.over)}>
    <span className={s.count}>{counted}</span> {counted===1?'upgrade':'upgrades'} learned. The game allows {WAR_PLAN_POINTS} points across all branches.{over&&' Check your tree.'}
   </p>
  </div>
  {stranded.length>0&&<Notice tone="warning">
   <p>Saved before HordeMind followed the tree: {stranded.join(', ')}. Learn an upgrade above {them}, or click {them} to remove.</p>
  </Notice>}
  <DiamondGraph label="Infernal Hordes War Plan" nodes={NODES} edges={WAR_PLAN_EDGES} state={id=>nodeState(learned,id)} focused={shown}
   onActivate={onToggle} onFocusNode={setShown} describedBy={detailId}/>
  <ul className={s.legend} aria-label="Legend">
   <li><span className={cx(s.swatch,s.learned)} aria-hidden="true"/>Learned</li>
   <li><span className={s.swatch} aria-hidden="true"/>Can learn</li>
   <li><span className={cx(s.swatch,s.locked)} aria-hidden="true"/>Locked or excluded</li>
  </ul>
  <Detail id={detailId} shown={shown} learned={learned}/>
 </div>;
}
