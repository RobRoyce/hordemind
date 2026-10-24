import {useId,useMemo,useRef,type KeyboardEvent} from 'react';
import {cx} from './cx';
import {DEFAULT_LAYOUT,layoutGraph,type GraphNodeInput,type LayoutOptions,type PlacedNode} from './graphLayout';
import s from './DiamondGraph.module.css';

export interface GraphNode extends GraphNodeInput{
 name:string;
 /** A second label line, such as "or Total Chaos" for a choose-one pair. */
 note?:string;
}
export type NodeState='learned'|'open'|'locked';

interface Props{
 nodes:readonly GraphNode[];
 layout?:LayoutOptions;
 state:(id:string)=>NodeState;
 /** The node showing its details, drawn with a faint gold ring. */
 focused:string|null;
 onActivate:(id:string)=>void;
 onFocusNode:(id:string)=>void;
 /** Names the graph for assistive tech, e.g. "Offers and Chaos". */
 label:string;
 /** Id of an element that describes every node, such as a details panel. */
 describedBy?:string;
}

const STEP:Readonly<Record<string,readonly [number,number]>>={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]};

/** The nearest node in an arrow's direction, favoring nodes in line with this one. */
function neighbor(nodes:readonly PlacedNode[],from:PlacedNode,[sx,sy]:readonly [number,number]){
 let best:PlacedNode|null=null,bestScore=Infinity;
 for(const n of nodes){
  const dx=n.x-from.x,dy=n.y-from.y;
  const along=dx*sx+dy*sy;
  if(n===from||along<=0)continue;
  const score=along+2*Math.abs(sx?dy:dx);
  if(score<bestScore){best=n;bestScore=score}
 }
 return best;
}

const diamondPoints=(x:number,y:number,h:number)=>`${x},${y-h} ${x+h},${y} ${x},${y+h} ${x-h},${y}`;

export function DiamondGraph({nodes,layout=DEFAULT_LAYOUT,state,focused,onActivate,onFocusNode,label,describedBy}:Props){
 const L=useMemo(()=>layoutGraph(nodes,layout),[nodes,layout]);
 const byId=useMemo(()=>new Map(nodes.map(n=>[n.id,n])),[nodes]);
 const buttons=useRef(new Map<string,HTMLButtonElement>());
 const idBase=useId();
 const half=layout.diamond/2;
 const lit=(from:string,to:string)=>state(from)==='learned'&&state(to)==='learned';

 // Gold connectors draw last, so they sit on top where paths share a trunk.
 const edges=[...L.connectors].sort((a,b)=>Number(lit(a.from,a.to))-Number(lit(b.from,b.to)));

 function onKeyDown(e:KeyboardEvent,from:PlacedNode){
  const step=STEP[e.key];
  if(!step)return;
  const to=neighbor(L.nodes,from,step);
  e.preventDefault();
  if(to)buttons.current.get(to.id)?.focus();
 }

 return <div role="group" aria-label={label} className={s.graph} style={{width:L.width,height:L.height}}>
  <svg className={s.svg} width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden="true" focusable="false">
   {edges.map(c=><path key={c.from+'>'+c.to} data-graph-edge="" data-from={c.from} data-to={c.to}
    className={cx(s.edge,lit(c.from,c.to)&&s.lit)} d={'M'+c.points.map(p=>p.join(' ')).join(' L')}/>)}
   {L.nodes.map(n=>{
    const node=byId.get(n.id)!;
    const st=state(n.id);
    return <g key={n.id} className={s[st]}>
     {focused===n.id&&<polygon className={s.ring} points={diamondPoints(n.x,n.y,half+6)}/>}
     <polygon className={s.diamond} points={diamondPoints(n.x,n.y,half)}/>
     <text data-graph-label={n.id} className={s.label} x={n.x} textAnchor="middle">
      <tspan className={s.name} x={n.x} y={n.label.y+layout.lineHeight-4}>{node.name}</tspan>
      {node.note&&<tspan className={s.note} x={n.x} y={n.label.y+2*layout.lineHeight-4}>{node.note}</tspan>}
     </text>
    </g>;
   })}
  </svg>
  {L.nodes.map(n=>{
   const node=byId.get(n.id)!;
   const st=state(n.id);
   const left=Math.min(n.diamond.x,n.label.x),right=Math.max(n.diamond.x+n.diamond.width,n.label.x+n.label.width);
   const noteId=node.note?`${idBase}-${n.id}`:undefined;
   return <button key={n.id} type="button" data-graph-node={n.id} ref={el=>{if(el)buttons.current.set(n.id,el);else buttons.current.delete(n.id)}}
    className={s.hit} style={{left,top:n.diamond.y,width:right-left,height:n.label.y+n.label.height-n.diamond.y}}
    aria-pressed={st==='learned'} aria-disabled={st==='locked'||undefined}
    aria-describedby={[noteId,describedBy].filter(Boolean).join(' ')||undefined}
    onClick={()=>{if(st!=='locked')onActivate(n.id)}} onFocus={()=>onFocusNode(n.id)} onMouseEnter={()=>onFocusNode(n.id)}
    onKeyDown={e=>onKeyDown(e,n)}>
    <span className="hm-visually-hidden">{node.name}</span>
    {node.note&&<span id={noteId} className="hm-visually-hidden">{node.note}</span>}
   </button>;
  })}
 </div>;
}
