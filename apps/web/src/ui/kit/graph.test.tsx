import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {DiamondGraph,type GraphNode,type NodeState} from './DiamondGraph';

// Server rendering never matches the phone query, so a test switches the phone layout on here.
const media=vi.hoisted(()=>({narrow:false}));
vi.mock('./useNarrow',()=>({useNarrow:()=>media.narrow}));

const Icon=({size,className}:{size?:number|string;className?:string})=><svg data-icon="" width={size} height={size} className={className}/>;
const NODES:GraphNode[]=[
 {id:'r',name:'Start',row:0,col:0,root:true,labelLines:0,labelWidth:0,icon:Icon},
 {id:'a',name:'Alpha',row:1,col:-1,labelLines:2,labelWidth:60,note:'or Beta',icon:Icon},
 {id:'b',name:'Beta',row:1,col:1,labelLines:2,labelWidth:60,mark:'◆ Hordes'},
 {id:'c',name:'Gamma',row:2,col:0,labelLines:1,labelWidth:60}
];
const EDGES=[['r','a'],['r','b'],['a','c'],['b','c']] as const;
const state=(id:string):NodeState=>id==='a'?'learned':id==='c'?'open':'locked';
const graph=(label='Test tree',focused:string|null=null)=><DiamondGraph label={label} nodes={NODES} edges={EDGES} state={state} focused={focused} onActivate={()=>{}} onFocusNode={()=>{}}/>;
const html=renderToStaticMarkup(graph());
const count=(re:RegExp)=>html.match(re)?.length??0;

describe('DiamondGraph',()=>{
 it('gives every node but the root a button and a label',()=>{
  expect(count(/data-graph-node=/g)).toBe(3);
  expect(html).not.toContain('data-graph-node="r"');
  expect(count(/data-graph-label=/g)).toBe(3);
  expect(html).not.toContain('data-graph-label="r"');
  expect(html).toMatch(/aria-pressed="true"[^>]*data-graph-node="a"|data-graph-node="a"[^>]*aria-pressed="true"/);
 });
 it('draws one straight wire per connection',()=>{
  const wires=[...html.matchAll(/<path[^>]*data-graph-edge=""[^>]*>/g)].map(m=>m[0]);
  expect(wires).toHaveLength(4);
  for(const w of wires)expect(w).toMatch(/d="M[\d.]+ [\d.]+ L[\d.]+ [\d.]+"/);
 });
 it('lights a connection once both ends are learned, counting the root as learned',()=>{
  expect(count(/data-graph-lit=/g)).toBe(1);
  expect(html).toMatch(/data-graph-lit=""[^>]*data-from="r"[^>]*data-to="a"/);
 });
 it('puts the note or mark on a second label line',()=>{
  for(const text of ['>Alpha<','>or Beta<','>Beta<','>◆ Hordes<'])expect(html).toContain(text);
 });
 it('draws icons at 26 px and the root icon at 30 px',()=>{
  expect(count(/data-icon="" width="26"/g)).toBe(1);
  expect(count(/data-icon="" width="30"/g)).toBe(1);
 });
 it('describes a node by its mark, even when its name has spaces',()=>{
  const nodes:GraphNode[]=[NODES[0]!,{id:'Reign in Hell',name:'Reign in Hell',row:1,col:0,labelLines:2,labelWidth:110,mark:'◆ Hordes'}];
  const out=renderToStaticMarkup(<DiamondGraph label="Marked" nodes={nodes} edges={[['r','Reign in Hell']]} state={()=>'open'} focused={null} onActivate={()=>{}} onFocusNode={()=>{}}/>);
  const ids=/aria-describedby="([^"]+)"/.exec(out)![1]!.split(' ');
  for(const id of ids)expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  const texts=ids.map(id=>new RegExp(`id="${id}"[^>]*>([^<]*)<`).exec(out)?.[1]);
  expect(texts).toContain('◆ Hordes');
 });
 it('gives each graph one Tab stop: the focused node, else the first learned upgrade, else the first node',()=>{
  const stop=(out:string)=>[...out.matchAll(/<button[^>]*>/g)].map(m=>m[0]).filter(b=>b.includes('tabindex="0"')).map(b=>/data-graph-node="([^"]+)"/.exec(b)![1]);
  expect(stop(html)).toEqual(['a']);
  expect(count(/tabindex="-1"/g)).toBe(2);
  expect(stop(renderToStaticMarkup(graph('Test tree','c')))).toEqual(['c']);
  const only=(st:(id:string)=>NodeState)=>renderToStaticMarkup(<DiamondGraph label="Other" nodes={NODES} edges={EDGES} state={st} focused={null} onActivate={()=>{}} onFocusNode={()=>{}}/>);
  expect(stop(only(id=>id==='b'?'learned':'open'))).toEqual(['b']);
  expect(stop(only(()=>'open'))).toEqual(['a']);
  expect(stop(renderToStaticMarkup(<>{graph('One')}{graph('Two','b')}</>))).toEqual(['a','b']);
 });
 it('badges each marked node on phones, where labels are hidden',()=>{
  const badges=(out:string)=>out.match(/data-graph-badge=/g)?.length??0;
  expect(badges(html)).toBe(0);
  media.narrow=true;
  try{
   const out=renderToStaticMarkup(graph());
   expect(out).not.toContain('data-graph-label=');
   expect(badges(out)).toBe(NODES.filter(n=>n.mark).length);
   expect(out).toMatch(/data-graph-badge="b"/);
  }finally{media.narrow=false}
 });
 it('keeps gradient and filter ids apart for two graphs on one page',()=>{
  const both=renderToStaticMarkup(<>{graph('One')}{graph('Two')}</>);
  const ids=[...both.matchAll(/<(?:linearGradient|radialGradient|filter) id="([^"]+)"/g)].map(m=>m[1]!);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  for(const id of ids)expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
 });
});
