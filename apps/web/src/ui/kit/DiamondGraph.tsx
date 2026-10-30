import {Fragment,useId,useMemo,useRef,useState,type ComponentType,type CSSProperties,type KeyboardEvent} from 'react';
import {cx} from './cx';
import {DEFAULT_LAYOUT,fitLayout,layoutGraph,type Connector,type GraphNodeInput,type PlacedNode} from './graphLayout';
import {useElementWidth} from './useElementWidth';
import {useNarrow} from './useNarrow';
import s from './DiamondGraph.module.css';

export interface GraphNode extends GraphNodeInput{
 name:string;
 /** A second label line, such as "or Total Chaos" for a choose-one pair. */
 note?:string;
 /** A label line under the name and note, such as "◆ Hordes". */
 mark?:string;
 /** Drawn in the diamond. It takes its colour from CSS `color`. */
 icon?:ComponentType<{size?:number|string;className?:string}>;
}
/** Excluded draws like locked but stays clickable: activating it swaps it in for its partner. */
export type NodeState='learned'|'open'|'excluded'|'locked';

interface Props{
 nodes:readonly GraphNode[];
 /** Connections between node ids. They have no direction. */
 edges:readonly (readonly [string,string])[];
 state:(id:string)=>NodeState;
 /** The node showing its details, drawn with a gold ring. It is the graph's Tab stop. */
 focused:string|null;
 onActivate:(id:string)=>void;
 onFocusNode:(id:string)=>void;
 /** Names the graph for assistive tech, e.g. "Infernal Hordes War Plan". */
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

const diamond=(x:number,y:number,r:number)=>`M${x} ${y-r} L${x+r} ${y} L${x} ${y+r} L${x-r} ${y} Z`;
const line=([[x1,y1],[x2,y2]]:Connector['points'])=>`M${x1} ${y1} L${x2} ${y2}`;
const MIN_HIT=44;
/** How far the focus ring sits outside the rim. */
const RING=6;
/** Half the width of the badge that stands in for a mark when labels are hidden. It hangs just below the ring. */
const BADGE=3;
/** Room around the graph for a blur to spread into. */
const FILTER_MARGIN=40;
const stop=(offset:number,color:string)=><stop offset={offset} style={{stopColor:color}}/>;

/** Learned ids and the ones learned since the set last changed, kept across unrelated re-renders. */
function useFreshlyLearned(learned:readonly string[]){
 const key=learned.join('\n');
 // Starts with nothing fresh, so the first render never animates.
 const [seen,setSeen]=useState(()=>({key,learned:new Set(learned),fresh:new Set<string>()}));
 // Set during render, so an abandoned render leaves no trace and a later hover re-render keeps the fresh set.
 if(seen.key!==key){
  const next={key,learned:new Set(learned),fresh:new Set(learned.filter(id=>!seen.learned.has(id)))};
  setSeen(next);
  return next;
 }
 return seen;
}

export function DiamondGraph({nodes,edges,state,focused,onActivate,onFocusNode,label,describedBy}:Props){
 const wrap=useRef<HTMLDivElement>(null);
 const width=useElementWidth(wrap);
 const narrow=useNarrow();
 const colSpan=useMemo(()=>Math.max(...nodes.map(n=>n.col))-Math.min(...nodes.map(n=>n.col)),[nodes]);
 const options=useMemo(()=>narrow?fitLayout(width,colSpan):DEFAULT_LAYOUT,[narrow,width,colSpan]);
 const L=useMemo(()=>layoutGraph(nodes,edges,options),[nodes,edges,options]);
 // Between the phone breakpoint and the natural width, the whole tree shrinks rather than scrolling sideways.
 const scale=narrow?1:Math.min(1,width/L.width);
 const byId=useMemo(()=>new Map(nodes.map(n=>[n.id,n])),[nodes]);
 const buttons=useRef(new Map<string,HTMLButtonElement>());
 const idBase=useId();
 const localId=(name:string)=>`hm${idBase.replace(/[^A-Za-z0-9_-]/g,'')}-${name}`;
 const url=(name:string)=>`url(#${localId(name)})`;

 const stateOf=(id:string):NodeState=>byId.get(id)?.root?'learned':state(id);
 const {learned,fresh}=useFreshlyLearned(nodes.filter(n=>stateOf(n.id)==='learned').map(n=>n.id));
 const lit=L.connectors.filter(c=>learned.has(c.from)&&learned.has(c.to));
 const targets=L.nodes.filter(n=>!n.root);
 // One Tab stop per graph; arrow keys move between nodes.
 const tabStop=(targets.find(n=>n.id===focused)??targets.find(n=>learned.has(n.id))??targets[0])?.id;
 const baseline=(n:PlacedNode,row:number)=>n.label!.y+(row+1)*options.lineHeight-4;

 function onKeyDown(e:KeyboardEvent,from:PlacedNode){
  const step=STEP[e.key];
  if(!step)return;
  const to=neighbor(targets,from,step);
  e.preventDefault();
  if(to)buttons.current.get(to.id)?.focus();
 }

 return <div ref={wrap} className={s.wrap}>
  <div role="group" aria-label={label} className={s.graph} style={{width:L.width*scale,height:L.height*scale}}>
   <div className={s.inner} style={{width:L.width,height:L.height,transform:scale<1?`scale(${scale})`:undefined}}>
    <svg className={s.svg} width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} aria-hidden="true" focusable="false">
     <defs>
      <linearGradient id={localId('rim')} x1="0" y1="0" x2="0" y2="1">
       {stop(0,'var(--hm-frame-edge-top)')}{stop(1,'var(--hm-frame-edge-bottom)')}
      </linearGradient>
      <linearGradient id={localId('rim-dim')} x1="0" y1="0" x2="0" y2="1">
       {stop(0,'color-mix(in srgb,var(--hm-frame-edge-top) 50%,var(--hm-bg))')}{stop(1,'color-mix(in srgb,var(--hm-frame-edge-bottom) 40%,var(--hm-bg))')}
      </linearGradient>
      <radialGradient id={localId('core-learned')} cx="50%" cy="42%" r="62%">
       {stop(0,'var(--hm-ember)')}{stop(.45,'var(--hm-ember-deep)')}{stop(1,'var(--hm-ember-dark)')}
      </radialGradient>
      <radialGradient id={localId('core-open')} cx="50%" cy="38%" r="70%">
       {stop(0,'color-mix(in srgb,var(--hm-rule) 40%,var(--hm-hair))')}{stop(1,'var(--hm-bg)')}
      </radialGradient>
      <radialGradient id={localId('core-locked')} cx="50%" cy="40%" r="70%">
       {stop(0,'var(--hm-sheet)')}{stop(1,'var(--hm-bg)')}
      </radialGradient>
      {/* Sized to the graph: a filter sized to a straight line's own box clips it to nothing. */}
      <filter id={localId('halo')} filterUnits="userSpaceOnUse" x={-FILTER_MARGIN} y={-FILTER_MARGIN} width={L.width+2*FILTER_MARGIN} height={L.height+2*FILTER_MARGIN}>
       <feGaussianBlur stdDeviation={options.radius*.35}/>
      </filter>
      <filter id={localId('glow')} filterUnits="userSpaceOnUse" x={-FILTER_MARGIN} y={-FILTER_MARGIN} width={L.width+2*FILTER_MARGIN} height={L.height+2*FILTER_MARGIN}>
       <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur"/>
       <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
     </defs>
     <g>{L.connectors.map(c=><path key={c.from+'>'+c.to} className={s.groove} d={line(c.points)}/>)}</g>
     <g>{L.connectors.map(c=><path key={c.from+'>'+c.to} data-graph-edge="" data-from={c.from} data-to={c.to} className={s.wire} d={line(c.points)}/>)}</g>
     <g>{lit.map(c=>{
      // A line lit just now draws itself from the end that was already learned.
      const drawing=fresh.has(c.from)||fresh.has(c.to);
      const [a,b]=c.points;
      const points=drawing&&fresh.has(c.from)&&!fresh.has(c.to)?[b,a] as const:c.points;
      const style=drawing?{'--len':Math.hypot(b[0]-a[0],b[1]-a[1])} as CSSProperties:undefined;
      return <path key={c.from+'>'+c.to} data-graph-lit="" data-from={c.from} data-to={c.to} className={cx(s.lit,drawing&&s.draw)} style={style}
       d={line(points)} filter={url('glow')}/>;
     })}</g>
     {L.nodes.map(n=>{
      const node=byId.get(n.id)!;
      const st=stateOf(n.id);
      const dim=st==='locked'||st==='excluded';
      const Icon=node.icon;
      const icon=(options.labels?26:16)+(n.root?4:0);
      return <g key={n.id} className={cx(s[st],n.root&&s.root,fresh.has(n.id)&&s.fresh)}>
       {st==='learned'&&<path className={s.halo} d={diamond(n.x,n.y,n.r+4)} filter={url('halo')}/>}
       <path className={s.backing} d={diamond(n.x,n.y,n.r+3)}/>
       {focused===n.id&&<path className={s.ring} d={diamond(n.x,n.y,n.r+RING)}/>}
       <path className={s.rim} d={diamond(n.x,n.y,n.r)} stroke={url(dim?'rim-dim':'rim')}/>
       <path data-graph-core={n.id} className={s.core} d={diamond(n.x,n.y,n.r-4)} fill={url(`core-${dim?'locked':st}`)}/>
       {Icon&&<g className={s.icon} transform={`translate(${n.x-icon/2} ${n.y-icon/2})`}><Icon size={icon} className={s.glyph}/></g>}
       {!options.labels&&node.mark&&<path data-graph-badge={n.id} className={s.badge} d={diamond(n.x,n.y+n.r+RING+BADGE,BADGE)}/>}
       {n.label&&<>
        <rect className={s.plate} x={n.label.x} y={n.label.y} width={n.label.width} height={n.label.height} rx={3}/>
        <text data-graph-label={n.id} className={s.label} x={n.x} textAnchor="middle">
         <tspan className={s.name} x={n.x} y={baseline(n,0)}>{node.name}</tspan>
         {node.note&&<tspan className={s.note} x={n.x} y={baseline(n,1)}>{node.note}</tspan>}
         {node.mark&&<tspan className={s.mark} x={n.x} y={baseline(n,node.note?2:1)}>{node.mark}</tspan>}
        </text>
       </>}
      </g>;
     })}
    </svg>
    {targets.map((n,i)=>{
     const node=byId.get(n.id)!;
     const st=stateOf(n.id);
     // Each target covers the node and its label, and is at least 44px across where the grid allows.
     const half=Math.max(Math.min(MIN_HIT,options.colWidth)/2,n.r,(n.label?.width??0)/2);
     const bottom=n.label?n.label.y+n.label.height:n.y+n.r;
     const tall=Math.min(MIN_HIT,options.rowHeight);
     const top=bottom-(n.y-n.r)>=tall?n.y-n.r:n.y-tall/2;
     const description=[node.note,node.mark].filter(Boolean).join('. ');
     const descriptionId=description?localId(`note-${i}`):undefined;
     // Safari doesn't focus a tapped button, so a click shows the node too.
     return <Fragment key={n.id}>
      <button type="button" data-graph-node={n.id} ref={el=>{if(el)buttons.current.set(n.id,el);else buttons.current.delete(n.id)}}
       className={s.hit} style={{left:n.x-half,top,width:2*half,height:Math.max(bottom,top+tall)-top}} tabIndex={n.id===tabStop?0:-1}
       aria-pressed={st==='learned'} aria-disabled={st==='locked'||undefined}
       aria-describedby={[descriptionId,describedBy].filter(Boolean).join(' ')||undefined}
       onClick={()=>{onFocusNode(n.id);if(st!=='locked')onActivate(n.id)}} onFocus={()=>onFocusNode(n.id)} onMouseEnter={()=>onFocusNode(n.id)}
       onKeyDown={e=>onKeyDown(e,n)}>
       <span className="hm-visually-hidden">{node.name}</span>
      </button>
      {/* The note and mark describe the node, so they stay out of the button's name. */}
      {description&&<span id={descriptionId} className="hm-visually-hidden">{description}</span>}
     </Fragment>;
    })}
   </div>
  </div>
 </div>;
}
