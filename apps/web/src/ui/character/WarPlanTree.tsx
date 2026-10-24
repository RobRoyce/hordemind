import {useId,useMemo,useState} from 'react';
import {WAR_PLAN_POINTS,available,nodeById,unsupported} from '../../domain/warplan';
import {COMPACT_LAYOUT,DEFAULT_LAYOUT,DiamondGraph,Notice,cx,useNarrow,type NodeState} from '../kit';
import {wrongInfoUrl} from '../report';
import {countedUpgrades,warPlanGraphNodes,type DrawnBranch} from './warPlanView';
import s from './WarPlanTree.module.css';

interface Props{learned:readonly string[];onToggle:(id:string)=>void}

const BRANCHES:readonly {id:DrawnBranch;title:string;note:string}[]=[
 {id:'offers',title:'Offers and Chaos',note:'Changes the offers you see and Chaos Waves.'},
 {id:'events',title:'Aether events',note:'Extra Aether sources during the run.'}
];

function Detail({id,shown,learned}:{id:string;shown:string|null;learned:readonly string[]}){
 const n=shown?nodeById(shown):null;
 return <div id={id} className={s.detail} role="region" aria-label="Upgrade details" aria-live="polite">
  {!n?<p className={s.muted}>Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it.</p>:<>
   <h4 className={s.detailName}>{n.id}</h4>
   <p className={s.tooltip}>{n.tooltip}</p>
   {n.exclusive&&<p className={s.muted}>Choose one: learning it replaces {n.exclusive}.</p>}
   <p><b>In HordeMind:</b> {n.use}</p>
   <p className={s.muted}>{learned.includes(n.id)?'Learned.':available(learned,n.id)?'Available: click to learn.':`Locked: learn ${n.parents.join(' or ')} first.`}</p>
   <a className={s.report} href={wrongInfoUrl(n.id,`Tooltip: ${n.tooltip}\nIn HordeMind: ${n.use}`)} target="_blank" rel="noreferrer">Tooltip or effect wrong? Report it</a>
  </>}
 </div>;
}

/** The Offers and Aether events branches, drawn from the game's rows and columns. Rewards only changes loot, so it isn't drawn. */
export function WarPlanTree({learned,onToggle}:Props){
 const narrow=useNarrow();
 const detailId=useId();
 const [shown,setShown]=useState<string|null>(null);
 const charWidth=narrow?7:8;
 const nodes=useMemo(()=>({offers:warPlanGraphNodes('offers',charWidth),events:warPlanGraphNodes('events',charWidth)}),[charWidth]);
 const state=(id:string):NodeState=>learned.includes(id)?'learned':available(learned,id)?'open':'locked';
 const counted=countedUpgrades(learned);
 const over=counted>WAR_PLAN_POINTS;
 const stranded=unsupported(learned).filter(id=>nodeById(id)?.branch!=='rewards');
 const them=stranded.length===1?'it':'them';

 return <div className={s.tree}>
  <p className={cx(s.counter,over&&s.over)}>
   {counted} {counted===1?'upgrade':'upgrades'} learned here. The game allows {WAR_PLAN_POINTS} points across all branches, Rewards included.{over&&' Check your tree.'}
  </p>
  {stranded.length>0&&<Notice tone="warning">
   <p>Saved before HordeMind followed the tree: {stranded.join(', ')}. Learn an upgrade above {them}, or click {them} to remove.</p>
  </Notice>}
  <div role="group" aria-label="War Plan" className={s.branches}>
   {BRANCHES.map(b=><div key={b.id} className={s.branch}>
    <h3 className={s.branchTitle}>{b.title}</h3>
    <p className={s.muted}>{b.note}</p>
    <DiamondGraph label={b.title} nodes={nodes[b.id]} layout={narrow?COMPACT_LAYOUT:DEFAULT_LAYOUT} state={state} focused={shown}
     onActivate={onToggle} onFocusNode={setShown} describedBy={detailId}/>
   </div>)}
  </div>
  <ul className={s.legend} aria-label="Legend">
   <li><span className={cx(s.swatch,s.learned)} aria-hidden="true"/>Learned</li>
   <li><span className={s.swatch} aria-hidden="true"/>Can learn</li>
   <li><span className={cx(s.swatch,s.locked)} aria-hidden="true"/>Locked or excluded</li>
  </ul>
  <p className={s.muted}>The Rewards branch (Exalted Council and the four upgrades after it) only changes loot, so it's left out here.</p>
  <Detail id={detailId} shown={shown} learned={learned}/>
 </div>;
}
