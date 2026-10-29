import {useId,useRef,useState,type ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {Button,DiamondGraph,Notice,cx,useNarrow,type GraphNode,type NodeState} from '../kit';
import {wrongInfoUrl} from '../report';
import s from './PlanTree.module.css';

interface Props{
 /** Names the tree, e.g. "Lair Bosses War Plan". */
 label:string;
 nodes:readonly GraphNode[];
 edges:readonly (readonly [string,string])[];
 state:(id:string)=>NodeState;
 onToggle:(id:string)=>void;
 /** The details panel's content under the upgrade's name. */
 detail:(id:string)=>ReactNode;
 /** Learned upgrades with no learned path to the root. */
 stranded:readonly string[];
 /** The tree has choose-one pairs, whose excluded upgrades draw as locked. */
 exclusive?:boolean;
}

/**
 * A War Plan tree with its legend and details panel. On desktop a click toggles a node. Phones have no labels,
 * so a tap only selects the node and scrolls to the panel, which offers Learn or Unlearn.
 */
export function PlanTree({label,nodes,edges,state,onToggle,detail,stranded,exclusive}:Props){
 const detailId=useId();
 const panel=useRef<HTMLDivElement>(null);
 const narrow=useNarrow();
 const [shown,setShown]=useState<string|null>(null);
 // The panel renders the new node before it scrolls, so the Learn button lands in view.
 function select(id:string){
  flushSync(()=>setShown(id));
  panel.current?.scrollIntoView({block:'nearest'});
 }
 const them=stranded.length===1?'it':'them';
 const name=nodes.find(n=>n.id===shown)?.name;
 const st=shown===null?null:state(shown);

 return <div className={s.tree}>
  {stranded.length>0&&<Notice tone="warning">
   <p>Saved before HordeMind followed the tree: {stranded.join(', ')}. Learn an upgrade that connects {them} to the top node, or unlearn {them}.</p>
  </Notice>}
  <DiamondGraph label={label} nodes={nodes} edges={edges} state={state} focused={shown}
   onActivate={narrow?select:onToggle} onFocusNode={setShown} describedBy={detailId}/>
  <ul className={s.legend} aria-label="Legend">
   <li><span className={cx(s.swatch,s.learned)} aria-hidden="true"/>Learned</li>
   <li><span className={s.swatch} aria-hidden="true"/>Can learn</li>
   <li><span className={cx(s.swatch,s.locked)} aria-hidden="true"/>{exclusive?'Locked or excluded':'Locked'}</li>
  </ul>
  {/* Not a live region: each node's aria-describedby already reads these details on focus. */}
  <div ref={panel} id={detailId} className={s.detail} role="region" aria-label={`${label} details`}>
   {shown===null?<p className={s.muted}>{narrow?'Tap an upgrade to read its in-game tooltip and how HordeMind uses it.'
    :'Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it.'}</p>:<>
    <h3 className={s.detailName}>{name}</h3>
    {narrow&&st!=='locked'&&<Button variant="primary" className={s.action} onClick={()=>onToggle(shown)}>
     {`${st==='learned'?'Unlearn':'Learn'} ${name}`}
    </Button>}
    {detail(shown)}
   </>}
  </div>
 </div>;
}

interface DetailProps{
 name:string;tooltip:string;
 /** A muted line under the tooltip, such as a choose-one rule or a seasonal bonus. */
 note?:string;
 /** How HordeMind uses the upgrade. */
 use:string;
 /** The upgrade's state in a sentence, e.g. "Learned." */
 status:string;
}

/** The panel content both trees share: tooltip, use, state and a report link. */
export function PlanDetail({name,tooltip,note,use,status}:DetailProps){
 return <>
  <p className={s.tooltip}>{tooltip}</p>
  {note&&<p className={s.muted}>{note}</p>}
  <p><b>In HordeMind:</b> {use}</p>
  <p className={s.muted}>{status}</p>
  <a className={s.report} href={wrongInfoUrl(name,`Tooltip: ${tooltip}\nIn HordeMind: ${use}`)} target="_blank" rel="noreferrer">Tooltip or effect wrong? Report it</a>
 </>;
}
