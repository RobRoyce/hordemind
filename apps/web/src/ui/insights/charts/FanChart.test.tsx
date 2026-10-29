import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {RunScores} from '../../../analysis/analyze';
import type {Scored} from '../../../analysis/reportCard';
import {FanChart,fanLayout} from './FanChart';

const sc=(from:number,to:number,actual:number,p10:number,p90:number):Scored=>
 ({span:{fromWave:from,toWave:to,actual,chaos:false},pred:{mean:(p10+p90)/2,sd:5,p10,p90},family:null});
const fp=(wave:number,mean:number)=>({wave,mean,p10:mean*.7,p25:mean*.85,p75:mean*1.15,p90:mean*1.3});
const fan=[fp(0,0),{wave:1,mean:110,p10:80,p25:95,p75:125,p90:150},fp(2,220),fp(3,330),fp(4,440),fp(5,550)];
const base=(over:Partial<RunScores>):RunScores=>({runId:'a',createdAt:new Date(Date.UTC(2026,9,1,18)).toISOString(),status:'completed',totalWaves:5,scored:[],fan,readings:[],...over});
const run=base({
 scored:[sc(1,1,120,80,150),sc(2,3,200,100,300),sc(4,5,900,200,400)],
 readings:[{wave:1,total:120},{wave:3,total:320},{wave:5,total:700}],
});
const equalEnds=base({readings:[{wave:1,total:120},{wave:5,total:550}]});
const withUnscored=base({scored:[sc(1,1,120,80,150)],readings:[{wave:1,total:120},{wave:5,total:700}]});
const oneReading=base({totalWaves:1,fan:[fp(0,0),fp(1,50)],scored:[sc(1,1,50,30,70)],readings:[{wave:1,total:50}]});
const html=(el:React.ReactElement)=>renderToStaticMarkup(el).replaceAll('&#x27;',"'");

describe('fanLayout',()=>{
 it('puts one dot per reading',()=>expect(fanLayout(run,640).dots).toHaveLength(run.readings.length));
 it('keeps the end labels at least 16 px apart',()=>{
  const l=fanLayout(equalEnds,640);
  expect(Math.abs(l.endYou.y-l.endModel.y)).toBeGreaterThanOrEqual(16);
 });
 it('says a reading without a scored span was not scored',()=>{
  expect(fanLayout(withUnscored,640).dots.at(-1)!.lines.at(-1)).toMatch(/^Not scored/);
 });
 it('gives each reading its tooltip lines',()=>{
  expect(fanLayout(run,640).dots[0]!.lines.slice(0,4)).toEqual(['You had 120 Aether','After wave 1','Model expected about 110','80% range 80–150']);
 });
 it('judges the gain of a one-wave and a longer span',()=>{
  const d=fanLayout(run,640).dots;
  expect(d.map(x=>x.verdict)).toEqual(['inside','inside','above']);
  expect(d[0]!.lines.at(-1)).toBe("This reading's gain was inside the model's range");
  expect(d[2]!.lines.at(-1)).toBe("The gain over waves 4–5 was above the model's range");
 });
});

describe('fanLayout fixes',()=>{
 const dense=base({totalWaves:20,fan:Array.from({length:21},(_,w)=>fp(w,w*20)),
  scored:[],readings:Array.from({length:20},(_,i)=>({wave:i+1,total:(i+1)*20}))});
 it('tiles the plot with hit areas',()=>{
  const l=fanLayout(dense,358),h=l.hits;
  expect(h).toHaveLength(20);
  expect(h[0]!.x).toBeCloseTo(l.x(0));
  for(let i=1;i<h.length;i++)expect(h[i]!.x).toBeCloseTo(h[i-1]!.x+h[i-1]!.width);
  const end=h.at(-1)!;
  expect(end.x+end.width).toBeCloseTo(358-80);
 });
 it('keeps both end labels inside the plot and 16 px apart',()=>{
  const top=base({fan:[fp(0,0),{wave:5,mean:600,p10:500,p25:550,p75:590,p90:600}],readings:[{wave:1,total:100},{wave:5,total:600}]});
  const l=fanLayout(top,640);
  for(const e of [l.endYou,l.endModel]){expect(e.y).toBeGreaterThanOrEqual(12+10);expect(e.y).toBeLessThanOrEqual(l.height-28-2)}
  expect(Math.abs(l.endYou.y-l.endModel.y)).toBeGreaterThanOrEqual(16);
 });
 it('labels Start, then multiples of the step, when waves are too close to label each',()=>{
  const run10=base({totalWaves:10,fan:Array.from({length:11},(_,w)=>fp(w,w*50)),readings:[{wave:10,total:500}]});
  const {waves}=fanLayout(run10,288);
  expect(waves).not.toContain(1);
  expect(waves).toEqual([0,2,4,6,8,10]);
 });
 it('leaves the zero tick without a y-axis label',()=>{
  expect(html(<FanChart runs={[run]}/>)).not.toMatch(/text-anchor="end"[^>]*>0</);
 });
});

describe('FanChart',()=>{
 it('draws a one-reading run without NaN',()=>{
  expect(html(<FanChart runs={[oneReading]}/>)).not.toContain('NaN');
 });
 it('renders the axis, the legend and one table row per reading',()=>{
  const out=html(<FanChart runs={[run]}/>);
  expect(out).toContain('>Start<');
  expect(out).toContain('Hover, tap or focus a reading to compare its gain with the model.');
  for(const t of ["Model's 80% range",'50% range',"Model's expected total",'Your total'])expect(out).toContain(t);
  expect(out.match(/<tr/g)).toHaveLength(run.readings.length+1);
 });
 it('labels the newest run last and steps back only',()=>{
  const out=html(<FanChart runs={[run,base({runId:'b'})]}/>);
  expect(out).toMatch(/Run of [^<]*, 2 of 2/);
  expect(out).toMatch(/<button[^>]*aria-label="Earlier run"(?![^>]*disabled)[^>]*>/);
  expect(out).toMatch(/<button[^>]*aria-label="Later run"[^>]*disabled/);
 });
 it('renders nothing without runs',()=>expect(html(<FanChart runs={[]}/>)).toBe(''));
});
