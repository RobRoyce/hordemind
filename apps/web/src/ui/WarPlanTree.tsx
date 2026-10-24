import {useState} from 'react';
import {WAR_PLAN,WAR_PLAN_POINTS,available,nodeById,unsupported,type Branch,type WarPlanNode} from '../domain/warplan';
import {wrongInfoUrl} from './report';

interface Props{learned:readonly string[];onToggle:(id:string)=>void}

const BRANCHES:readonly {id:Branch;title:string;note:string}[]=[
 {id:'rewards',title:'Rewards',note:'End-of-run loot only, so HordeMind ignores it.'},
 {id:'offers',title:'Offers and Chaos',note:'Changes the offers you see and Chaos Waves.'},
 {id:'events',title:'Aether events',note:'Extra Aether sources during the run.'}
];
const center=(n:WarPlanNode)=>({x:n.col+0.5,y:n.row+0.5});

function Branch({branch,learned,onToggle,onShow}:{branch:typeof BRANCHES[number];learned:readonly string[];onToggle:(id:string)=>void;onShow:(id:string)=>void}){
 const nodes=WAR_PLAN.filter(n=>n.branch===branch.id);
 const rows=Math.max(...nodes.map(n=>n.row))+1;
 const passive=branch.id==='rewards';
 const links=nodes.flatMap(n=>n.parents.map(p=>nodeById(p)).filter((p):p is WarPlanNode=>p!==null).map(p=>({from:center(p),to:center(n),key:p.id+'>'+n.id,lit:learned.includes(p.id)&&learned.includes(n.id)})));
 const pairs=nodes.filter(n=>n.exclusive&&n.id<n.exclusive).map(n=>({a:center(n),b:center(nodeById(n.exclusive!)!),key:n.id}));
 return <section className={'wp-branch'+(passive?' passive':'')} aria-label={branch.title}>
  <h3>{branch.title}</h3>
  <p className="micro">{branch.note}</p>
  <div className="wp-grid" style={{gridTemplateRows:`repeat(${rows},var(--wp-row))`}}>
   <svg className="wp-links" viewBox={`0 0 3 ${rows}`} preserveAspectRatio="none" aria-hidden="true">
    {links.map(l=><line key={l.key} x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y} className={l.lit?'lit':''}/>)}
    {/* A pair with a node between them arcs over it, so the dotted line can't read as linking that node. */}
    {pairs.map(p=>Math.abs(p.a.x-p.b.x)>1&&nodes.some(n=>center(n).y===p.a.y&&center(n).x===(p.a.x+p.b.x)/2)?
     <path key={p.key} d={`M${p.a.x} ${p.a.y-0.2} Q${(p.a.x+p.b.x)/2} ${p.a.y-0.9} ${p.b.x} ${p.b.y-0.2}`} className="exclusive"/>:
     <line key={p.key} x1={p.a.x} y1={p.a.y} x2={p.b.x} y2={p.b.y} className="exclusive"/>)}
   </svg>
   {nodes.map(n=>{
    const isLearned=learned.includes(n.id),open=available(learned,n.id);
    const state=passive?'passive':isLearned?'learned':open?'open':'locked';
    return <button key={n.id} type="button" className={'wp-node '+state} style={{gridRow:n.row+1,gridColumn:n.col+1}}
     aria-pressed={passive?undefined:isLearned} aria-disabled={passive||(!open&&!isLearned)||undefined}
     aria-describedby="wp-detail" onMouseEnter={()=>onShow(n.id)} onFocus={()=>onShow(n.id)}
     onClick={()=>{onShow(n.id);if(!passive)onToggle(n.id)}}>
     {n.id}
    </button>;
   })}
  </div>
 </section>;
}

function Detail({id,learned}:{id:string|null;learned:readonly string[]}){
 const n=id?nodeById(id):null;
 if(!n)return <div className="wp-detail" id="wp-detail" role="region" aria-label="Upgrade details"><p className="micro">Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it.</p></div>;
 const isLearned=learned.includes(n.id),open=available(learned,n.id);
 const status=n.branch==='rewards'?'Not tracked: rewards only.':isLearned?'Learned.':open?'Available: click to learn.':
  `Locked: learn ${n.parents.join(' or ')} first.`;
 return <div className="wp-detail" id="wp-detail" role="region" aria-label="Upgrade details" aria-live="polite">
  <h4>{n.id}</h4>
  <p className="wp-tooltip">{n.tooltip}</p>
  {n.exclusive&&<p className="micro">Choose one: learning it replaces {n.exclusive}.</p>}
  <p><b>In HordeMind:</b> {n.use}</p>
  <p className="micro">{status}</p>
  <a className="report-link" href={wrongInfoUrl(n.id,`Tooltip: ${n.tooltip}\nIn HordeMind: ${n.use}`)} target="_blank" rel="noreferrer">Tooltip or effect wrong? Report it</a>
 </div>;
}

export function WarPlanTree({learned,onToggle}:Props){
 const [shown,setShown]=useState<string|null>(null);
 const counted=learned.filter(id=>nodeById(id)&&nodeById(id)!.branch!=='rewards');
 const stranded=unsupported(learned).filter(id=>nodeById(id)!.branch!=='rewards');
 return <div className="wp-tree">
  <p className={'wp-points'+(counted.length>WAR_PLAN_POINTS?' over':'')}>
   {counted.length} upgrades learned outside Rewards.
   {counted.length>WAR_PLAN_POINTS&&` The game allows ${WAR_PLAN_POINTS} points in total; check your tree.`}
  </p>
  {stranded.length>0&&<p className="field-error" role="status">
   Saved before HordeMind followed the tree: {stranded.join(', ')}. Learn an upgrade above {stranded.length===1?'it':'them'}, or click {stranded.length===1?'it':'them'} to remove.
  </p>}
  <div className="wp-branches">
   {BRANCHES.map(b=><Branch key={b.id} branch={b} learned={learned} onToggle={onToggle} onShow={setShown}/>)}
  </div>
  <Detail id={shown} learned={learned}/>
 </div>;
}
