import {useRef,useState} from 'react';
import type {OfferFamily} from '../../../catalog';
import {WAR_PLAN,nodeById,toggleNode,type Branch} from '../../../domain/warplan';
import {nodeState} from '../../character/warPlanView';
import {
 Button,CategoryMark,Checkbox,DangerMark,DiamondGraph,Disclosure,Field,Frame,Notice,NumberField,Numeral,PageHeader,
 RuledList,SectionHeading,Segmented,Select,Sheet,Tabs,TextField,Toast,WaveTrack,COMPACT_LAYOUT,DEFAULT_LAYOUT,useNarrow,
 type GraphNode
} from '..';
import g from './gallery.module.css';

const FAMILIES:readonly OfferFamily[]=['Masses','Spires','Hellborne','Fiends','Lords','Monsters','Hellfire','Player boon','Player bane','Council','Special boss','Chaos'];
const REALMS=[{value:'Season 15',label:'Season 15'},{value:'Eternal',label:'Eternal'}] as const;
const SPEEDS=[{value:'unknown',label:'Not sure'},{value:'fast',label:'Fast'},{value:'average',label:'Average'},{value:'slow',label:'Slow'}] as const;

/** War Plan nodes for one branch, with label boxes estimated at `charWidth` per character. */
function branchNodes(branch:Branch,charWidth:number):GraphNode[]{
 return WAR_PLAN.filter(n=>n.branch===branch).map(n=>({
  id:n.id,name:n.id,row:n.row,col:n.col,parents:n.parents,
  ...(n.exclusive?{note:`or ${n.exclusive}`}:{}),
  labelLines:n.exclusive?2:1,
  labelWidth:charWidth*Math.max(n.id.length,n.exclusive?('or '+n.exclusive).length:0)
 }));
}

function Section({title,children}:{title:string;children:React.ReactNode}){
 return <section className={g.section}><SectionHeading>{title}</SectionHeading>{children}</section>;
}

export function KitGallery(){
 const narrow=useNarrow();
 const [realm,setRealm]=useState<(typeof REALMS)[number]['value']>('Season 15');
 const [speed,setSpeed]=useState<(typeof SPEEDS)[number]['value']>('unknown');
 const [tab,setTab]=useState('a');
 const [synced,setSynced]=useState(true);
 const [toast,setToast]=useState(false);
 const [sheet,setSheet]=useState(false);
 const opener=useRef<HTMLButtonElement>(null);
 // Reign in Hell makes Total Chaos show the excluded state.
 const [learned,setLearned]=useState<string[]>(['Method and Madness','Reign in Hell','Impending Doom','Cult of Annihilation']);
 const [focused,setFocused]=useState<string|null>(null);

 const layout=narrow?COMPACT_LAYOUT:DEFAULT_LAYOUT;
 const charWidth=narrow?7:8;
 const graph=(branch:Branch,title:string)=><div className={g.branch}>
  <h3 className={g.branchTitle}>{title}</h3>
  <DiamondGraph label={title} nodes={branchNodes(branch,charWidth)} layout={layout} state={id=>nodeState(learned,id)} focused={focused}
   onActivate={id=>setLearned(l=>toggleNode(l,id))} onFocusNode={setFocused}/>
 </div>;

 return <main className={g.page}>
  <PageHeader title="HordeMind kit" lead="Every component in every state. The app never links to this page."/>

  <Section title="Buttons">
   <div className={g.row}>
    <Button variant="primary">Take The Puffing Masses</Button>
    <Button>Edit character</Button>
    <Button variant="text">End run early</Button>
    <Button variant="primary" disabled>Choose the offer you took</Button>
   </div>
  </Section>

  <Section title="Fields">
   <div className={g.grid}>
    <Field label="Character name" help="A label for this character. Keep separate profiles for different builds.">
     {w=><TextField wire={w} defaultValue="Blessed Shield Paladin"/>}
    </Field>
    <Field label="Build planner link" error="This does not look like a web address.">
     {w=><TextField wire={w} defaultValue="not a link" inputMode="url"/>}
    </Field>
    <Field label="Difficulty">
     {w=><Select wire={w} defaultValue="Torment XII">{['Not set','Torment I','Torment XII'].map(x=><option key={x}>{x}</option>)}</Select>}
    </Field>
    <Field label="Aether after wave 2" hint="Optional. The total shown in game.">
     {w=><NumberField wire={w} min={0} placeholder="Total shown in game"/>}
    </Field>
   </div>
   <Checkbox label="Sync runs to my private account" checked={synced} onChange={setSynced}/>
  </Section>

  <Section title="Choices">
   <div className={g.stack}>
    <Segmented label="Realm" value={realm} options={REALMS} onChange={setRealm}/>
    <Segmented label="Elite and Lord clear speed" value={speed} options={SPEEDS} onChange={setSpeed}/>
    <Tabs label="Saved characters" current={tab} onSelect={setTab}
     items={[{id:'a',label:'Blessed Shield',detail:'Paladin'},{id:'b',label:'Bone Spear',detail:'Necromancer'}]}
     trailing={<Button variant="text">New character</Button>}/>
    <Disclosure summary="Why this estimate">
     <p className={g.p}>Simulated 5–95% range: 140 to 290 Aether.</p>
    </Disclosure>
   </div>
  </Section>

  <Section title="Notices">
   <div className={g.stack}>
    <Notice tone="info" label="Black Pact advice"><p className={g.p}><strong>Black Pact.</strong> Save the Pact for a Masses wave later in the run.</p></Notice>
    <Notice tone="warning"><p className={g.p}>Some offers aren't modeled yet, so the best modeled offer may not be the best offer.</p></Notice>
    <Notice tone="error"><p className={g.p}><strong>The simulator failed.</strong> Reload the page to try again.</p></Notice>
    <div><Button onClick={()=>setToast(true)}>Show a toast</Button></div>
   </div>
   <Toast message={toast?'Wave 2: The Anchored Masses recorded':null} action={{label:'Undo',onClick:()=>setToast(false)}}/>
  </Section>

  <Section title="Numbers">
   <div className={g.row}>
    <Numeral label="Wave" value={3} of={10}/>
    <Numeral label="Aether" value={412} note="after wave 2" tone="ember"/>
    <Numeral label="Aether" value={null}/>
   </div>
   <WaveTrack total={10} taken={['The Puffing Masses','The Bursting Masses']} deciding/>
  </Section>

  <Section title="Frame">
   <Frame label="Recommendation">
    <p className={g.kicker}>Best pick</p>
    <p className={g.pickName}>The Puffing Masses</p>
    <p className={g.p}><span className={g.ember}>+213 Aether</span> by run end, 68 more than The Chaotic Offering</p>
    <p className={g.why}>Mostly from Masses (+213) over 10 waves.</p>
    <p className={g.small}>Holds under every timing assumption tested.</p>
   </Frame>
  </Section>

  <Section title="Marks">
   <div className={g.marks}>
    {FAMILIES.map(f=><CategoryMark key={f} family={f}/>)}
    <CategoryMark family={null}/>
   </div>
   <div className={g.row}>
    <DangerMark danger={{level:'high',why:'Elites explode on death.'}}/>
    <DangerMark danger={{level:'some',why:'Damage from Masses applies Vulnerable.'}}/>
   </div>
  </Section>

  <Section title="Ruled list">
   <RuledList label="Runs">
    <div className={g.listRow}><span>CI Paladin, Paladin</span><span className={g.ember}>412 Aether</span></div>
    <div className={g.listRow}><span>Bone Spear, Necromancer</span><span className={g.amber}>In progress</span></div>
   </RuledList>
  </Section>

  <Section title="Sheet">
   <div><Button ref={opener} onClick={()=>setSheet(true)}>Open the sheet</Button></div>
   <Sheet open={sheet} title="Offer 2 of 3" onClose={()=>setSheet(false)} returnFocus={opener}>
    <Field label="Search offers">{w=><TextField wire={w} placeholder="Type to search…"/>}</Field>
    <div className={g.tiles}>
     {FAMILIES.slice(0,6).map(f=><button key={f} type="button" className={g.tile}><CategoryMark family={f}/><span className={g.small}>Offers</span></button>)}
    </div>
   </Sheet>
  </Section>

  <Section title="War Plan graph">
   <div className={g.branches}>
    {graph('offers','Offers and Chaos')}
    {graph('events','Aether events')}
   </div>
   <p className={g.small}>{focused?nodeById(focused)?.tooltip:'Hover or focus an upgrade to read its tooltip.'}</p>
  </Section>
 </main>;
}
