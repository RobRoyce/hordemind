import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {RunScores} from '../../../analysis/analyze';
import type {Scored} from '../../../analysis/reportCard';
import {RangeStrip,stripLayout} from './RangeStrip';

const sc=(from:number,to:number,actual:number,p10:number,p90:number,mean=(p10+p90)/2):Scored=>
 ({span:{fromWave:from,toWave:to,actual,chaos:false},pred:{mean,sd:5,p10,p90},family:null});
const run=(id:string,day:number,scored:Scored[]):RunScores=>({runId:id,createdAt:new Date(Date.UTC(2026,9,day,18)).toISOString(),status:'completed',totalWaves:10,scored,fan:[],readings:[]});
const newest=run('c',3,[sc(1,1,10,20,40),sc(2,2,40,20,40),sc(3,4,90,40,80),sc(5,5,100,30,60)]);
const runs=[newest,run('b',2,[sc(1,1,30,20,40)]),run('a',1,[sc(1,1,30,20,40)])];
const html=(el:React.ReactElement)=>renderToStaticMarkup(el).replaceAll('&#x27;',"'");

describe('RangeStrip',()=>{
 it('renders nothing without runs',()=>expect(html(<RangeStrip runs={[]}/>)).toBe(''));
 it('draws one dot per scored span of the newest run',()=>{
  expect(html(<RangeStrip runs={runs}/>).match(/data-state=/g)).toHaveLength(4);
 });
 it('labels the newest run last and steps back only',()=>{
  const out=html(<RangeStrip runs={runs}/>);
  expect(out).toMatch(/Run of [^<]*, 3 of 3/);
  expect(out).toMatch(/<button[^>]*aria-label="Earlier run"(?![^>]*disabled)[^>]*>/);
  expect(out).toMatch(/<button[^>]*aria-label="Later run"[^>]*disabled/);
 });
 it('marks a dot below, inside or above its range, with the bounds inclusive',()=>{
  const out=html(<RangeStrip runs={runs}/>);
  const states=[...out.matchAll(/data-state="(\w+)"/g)].map(m=>m[1]);
  expect(states).toEqual(['below','inside','above','above']);
 });
 it('holds a table of the run with its totals',()=>{
  const out=html(<RangeStrip runs={runs}/>);
  expect(out).toContain('Show as a table');
  expect(out).toContain('Waves 3–4');
 });
 it('says what each mark shows without hovering',()=>{
  const out=html(<RangeStrip runs={runs}/>);
  expect(out).toContain("You gained 90 Aether. Waves 3–4. Model's range 40–80, about 60. Covers 2 waves because a reading was missed");
 });
});

describe('stripLayout',()=>{
 const l=stripLayout(newest,640);
 it('widens a 2-wave bar by one band',()=>{
  const one=l.marks[0]!,two=l.marks[2]!;
  expect(two.barW).toBeCloseTo(one.barW+l.band);
 });
 it('puts the bar ends at the per-wave range on the y scale',()=>{
  const two=l.marks[2]!;
  expect(two.barTop).toBeCloseTo(l.y(80/2));
  expect(two.barBottom).toBeCloseTo(l.y(40/2));
 });
 it('sizes the axis from the per-wave p90 and gain',()=>{
  expect(l.max).toBe(100);
 });
});
