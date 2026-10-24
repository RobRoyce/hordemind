import {describe,expect,it} from 'vitest';
import {WAR_PLAN} from '../../domain/warplan';
import {COMPACT_LAYOUT,DEFAULT_LAYOUT,layoutGraph,type Box,type GraphLayout,type GraphNodeInput,type LayoutOptions} from './graphLayout';

type Point=readonly [number,number];
type Seg=readonly [Point,Point];

/** The real offers branch, with label boxes estimated at `charWidth` per character. */
function offersBranch(charWidth:number):GraphNodeInput[]{
 return WAR_PLAN.filter(n=>n.branch==='offers').map(n=>({
  id:n.id,row:n.row,col:n.col,parents:n.parents,
  labelLines:1+(n.exclusive?1:0),
  labelWidth:charWidth*Math.max(n.id.length,n.exclusive?('or '+n.exclusive).length:0)
 }));
}
const pairs=<T,>(xs:readonly T[])=>xs.flatMap((a,i)=>xs.slice(i+1).map(b=>[a,b] as const));
const segs=(points:readonly Point[]):Seg[]=>points.slice(1).map((p,i)=>[points[i]!,p] as const);
const intersects=(p:Box,q:Box)=>p.x<q.x+q.width&&q.x<p.x+p.width&&p.y<q.y+q.height&&q.y<p.y+p.height;

/** An axis-aligned segment crossing a box's interior. Touching an edge doesn't count. */
function segHitsBox([[x1,y1],[x2,y2]]:Seg,b:Box){
 const [lx,hx]=[Math.min(x1,x2),Math.max(x1,x2)],[ly,hy]=[Math.min(y1,y2),Math.max(y1,y2)];
 if(x1===x2)return x1>b.x&&x1<b.x+b.width&&hy>b.y&&ly<b.y+b.height;
 return y1>b.y&&y1<b.y+b.height&&hx>b.x&&lx<b.x+b.width;
}

const CASES:[string,LayoutOptions,number][]=[['default',DEFAULT_LAYOUT,8],['compact',COMPACT_LAYOUT,7]];

describe.each(CASES)('War Plan offers branch, %s layout',(_,options,charWidth)=>{
 const layout=():GraphLayout=>layoutGraph(offersBranch(charWidth),options);
 const node=(L:GraphLayout,id:string)=>L.nodes.find(n=>n.id===id)!;
 const connector=(L:GraphLayout,from:string,to:string)=>L.connectors.find(c=>c.from===from&&c.to===to)!;

 it('no two node boxes overlap',()=>{
  const L=layout();
  for(const [a,b] of pairs(L.nodes))
   for(const [p,q] of [[a.diamond,b.diamond],[a.label,b.label],[a.diamond,b.label],[a.label,b.diamond]] as const)
    expect(intersects(p,q),`${a.id}/${b.id}`).toBe(false);
 });
 it('connectors are right-angled',()=>{
  for(const c of layout().connectors)for(const [p,q] of segs(c.points))expect(p[0]===q[0]||p[1]===q[1],`${c.from}>${c.to}`).toBe(true);
 });
 it('connectors leave below the parent label',()=>{
  const L=layout();
  for(const c of L.connectors){
   const parent=node(L,c.from);
   expect(c.points[0]![1],`${c.from}>${c.to}`).toBeGreaterThan(parent.label.y+parent.label.height);
  }
 });
 it('no connector crosses a node or label it does not join',()=>{
  const L=layout();
  for(const c of L.connectors)for(const n of L.nodes.filter(n=>n.id!==c.from&&n.id!==c.to))for(const s of segs(c.points))
   expect(segHitsBox(s,n.diamond)||segHitsBox(s,n.label),`${c.from}>${c.to} hits ${n.id}`).toBe(false);
 });
 it('the Black Pact takes side parents at its side vertices',()=>{
  const L=layout();
  const bp=node(L,'The Black Pact');
  expect(connector(L,'Bedlam','The Black Pact').points.at(-1)).toEqual([bp.x+options.diamond/2,bp.y]);
  expect(connector(L,'Pulse of Aether','The Black Pact').points.at(-1)).toEqual([bp.x-options.diamond/2,bp.y]);
 });
});

describe('graph extent',()=>{
 it('starts at the leftmost used column',()=>{
  const events=WAR_PLAN.filter(n=>n.branch==='events').map(n=>({id:n.id,row:n.row,col:n.col,parents:n.parents,labelLines:1,labelWidth:100}));
  const L=layoutGraph(events,DEFAULT_LAYOUT);
  expect(L.width).toBe(DEFAULT_LAYOUT.colWidth);
  expect(L.nodes.every(n=>n.x===DEFAULT_LAYOUT.colWidth/2)).toBe(true);
 });
 it.each(CASES)('keeps every label box inside the graph, %s layout',(_,options,charWidth)=>{
  const events=WAR_PLAN.filter(n=>n.branch==='events').map(n=>({id:n.id,row:n.row,col:n.col,parents:n.parents,labelLines:1,labelWidth:charWidth*n.id.length}));
  const L=layoutGraph(events,options);
  for(const n of L.nodes){
   expect(n.label.x,n.id).toBeGreaterThanOrEqual(0);
   expect(n.label.x+n.label.width,n.id).toBeLessThanOrEqual(L.width);
  }
 });
 it('three compact columns fit a 390px phone with 16px gutters',()=>{
  expect(layoutGraph(offersBranch(7),COMPACT_LAYOUT).width).toBeLessThanOrEqual(390-32);
 });
});
