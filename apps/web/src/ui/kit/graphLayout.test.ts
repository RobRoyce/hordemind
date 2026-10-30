import {describe,expect,it} from 'vitest';
import {DEFAULT_LAYOUT,fitLayout,layoutGraph,type GraphLayout,type GraphNodeInput} from './graphLayout';

/** A node with one label line, 60 px wide. */
const n=(id:string,col:number,row:number):GraphNodeInput=>({id,col,row,labelLines:1,labelWidth:60});
const at=(l:GraphLayout,id:string)=>l.nodes.find(x=>x.id===id)!;
const sevenColumns=[-3,-2,-1,0,1,2,3].map(c=>n(`c${c}`,c,0));

describe('layoutGraph',()=>{
 it('places nodes on the grid from row and col',()=>{
  const l=layoutGraph([n('a',0,0),n('b',1,1)],[['a','b']],DEFAULT_LAYOUT);
  expect(at(l,'b').x-at(l,'a').x).toBe(112);expect(at(l,'b').y-at(l,'a').y).toBe(116);
 });
 it('draws each connection as a straight line between node centres',()=>{
  const l=layoutGraph([n('a',0,0),n('b',1,1)],[['a','b']],DEFAULT_LAYOUT);
  expect(l.connectors[0]!.points).toEqual([[at(l,'a').x,at(l,'a').y],[at(l,'b').x,at(l,'b').y]]);
 });
 it('draws the root larger and without a label',()=>{
  const root=at(layoutGraph([{...n('r',0,0),root:true}],[],DEFAULT_LAYOUT),'r');
  expect(root.r).toBe(32);expect(root.label).toBeNull();
 });
 it('shifts right so the widest label starts inside the graph',()=>{
  const l=layoutGraph([{...n('a',0,0),labelWidth:300}],[],DEFAULT_LAYOUT);
  expect(at(l,'a').label!.x).toBeGreaterThanOrEqual(0);
 });
 it('fits the content width with no labels',()=>{
  for(const w of [358,288]){
   const l=layoutGraph(sevenColumns,[],fitLayout(w,6));
   expect(l.width).toBeLessThanOrEqual(w);
   expect(l.nodes.every(x=>x.label===null)).toBe(true);
  }
 });
 it('puts each label a gap below its node, one line height per line',()=>{
  const a=at(layoutGraph([{...n('a',0,0),labelLines:2}],[],DEFAULT_LAYOUT),'a');
  expect(a.label).toEqual({x:a.x-30,y:a.y+26+8,width:60,height:32});
 });
 it('sizes the graph to the outermost node or label',()=>{
  const l=layoutGraph([n('a',0,0),n('b',2,3)],[],DEFAULT_LAYOUT);
  expect(l.width).toBe(at(l,'b').x+74);
  expect(l.height).toBe(at(l,'b').label!.y+16+8);
 });
});
