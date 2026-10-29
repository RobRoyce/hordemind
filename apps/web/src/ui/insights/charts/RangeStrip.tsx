import {useRef,useState} from 'react';
import type {RunScores} from '../../../analysis/analyze';
import type {Scored} from '../../../analysis/reportCard';
import {Disclosure} from '../../kit';
import {runDate} from '../RunHistory';
import rc from '../ReportCardSection.module.css';
import {ChartTip,useTip} from './ChartTip';
import {niceMax} from './scale';
import {NARROW_BELOW,useChartWidth} from './useChartWidth';
import s from './charts.module.css';

const L=36,R=8,T=10,B=28,BAR=16,DOT=5;

export type DotState='inside'|'below'|'above';
export interface StripMark{scored:Scored;k:number;cx:number;barW:number;barTop:number;barBottom:number;meanY:number;dotY:number;state:DotState}

const perWave=(sc:Scored)=>{
 const k=sc.span.toWave-sc.span.fromWave+1;
 return {k,lo:sc.pred.p10/k,hi:sc.pred.p90/k,mean:sc.pred.mean/k,actual:sc.span.actual/k};
};
const stateOf=({span,pred}:Scored):DotState=>span.actual<pred.p10?'below':span.actual>pred.p90?'above':'inside';

/** Geometry of one run's strip: scales, ticks and one mark per scored span. */
export function stripLayout(run:RunScores,width:number){
 const narrow=width<NARROW_BELOW,height=narrow?200:230,ph=height-T-B,pw=width-L-R;
 const band=pw/run.totalWaves;
 const {max,step}=niceMax(Math.max(0,...run.scored.flatMap(sc=>{const p=perWave(sc);return [p.hi,p.actual]})));
 const y=(v:number)=>T+ph-v/max*ph;
 const x=(wave:number)=>L+(wave-0.5)*band;
 const marks:StripMark[]=run.scored.map(scored=>{
  const {k,lo,hi,mean,actual}=perWave(scored);
  return {scored,k,cx:(x(scored.span.fromWave)+x(scored.span.toWave))/2,barW:Math.min(BAR,band*.42)+(k-1)*band,
   barTop:y(hi),barBottom:y(lo),meanY:y(mean),dotY:y(actual),state:stateOf(scored)};
 });
 const ticks=Array.from({length:Math.floor(max/step)+1},(_,i)=>i*step);
 const every=band>=22?1:band>=11?2:5;
 const waves=Array.from({length:run.totalWaves},(_,i)=>i+1).filter(w=>w%every===0||w===1);
 return {width,height,ph,band,max,step,y,x,marks,ticks,waves};
}

const r=Math.round;
const wavesText=({fromWave,toWave}:Scored['span'])=>fromWave===toWave?`Wave ${fromWave}`:`Waves ${fromWave}–${toWave}`;
function tipLines({span,pred}:Scored,k:number){
 return [`You gained ${r(span.actual)} Aether`,wavesText(span),`Model's range ${r(pred.p10)}–${r(pred.p90)}, about ${r(pred.mean)}`,
  ...(k>1?[`Covers ${k} waves because a reading was missed`]:[])];
}

/** The model's 80% range against the Aether gained, one bar per scored reading, one run at a time. */
export function RangeStrip({runs}:{runs:RunScores[]}){
 return runs.length?<Strip runs={runs}/>:null;
}

function Strip({runs}:{runs:RunScores[]}){
 const [at,setAt]=useState(0);
 const ref=useRef<HTMLDivElement>(null);
 const width=useChartWidth(ref);
 const {tip,hit,clear}=useTip();
 const i=Math.min(at,runs.length-1),run=runs[i]!;
 const l=stripLayout(run,width),label=`Run of ${runDate(run.createdAt)}, ${runs.length-i} of ${runs.length}`;
 const go=(to:number)=>{clear();setAt(to)};
 return <div className={s.block}>
  <h3 className={s.title}>Wave by wave</h3>
  <p className={s.note}>Each bar is the model's 80% range for one reading, and the dot is what you gained. Where a reading was missed, one wide bar covers those waves and shows the average per wave.</p>
  <div className={s.stepper}>
   <button type="button" className={s.step} aria-label="Earlier run" disabled={i>=runs.length-1} onClick={()=>go(i+1)}>‹</button>
   <span aria-live="polite">{label}</span>
   <button type="button" className={s.step} aria-label="Later run" disabled={i<=0} onClick={()=>go(i-1)}>›</button>
  </div>
  <div ref={ref} className={s.wrap}>
   <svg className={s.svg} width={width} height={l.height} viewBox={`0 0 ${width} ${l.height}`} role="group" aria-label={`Wave by wave, ${label}`}>
    {l.ticks.map(v=><g key={v}>
     <line className={s.grid} x1={L} x2={width-R} y1={l.y(v)} y2={l.y(v)}/>
     <text className={s.axis} x={L-8} y={l.y(v)+4} textAnchor="end">{v}</text>
    </g>)}
    {l.waves.map(w=><text key={w} className={s.axis} x={l.x(w)} y={l.height-8} textAnchor="middle">{w}</text>)}
    {l.marks.map(m=>{
     const lines=tipLines(m.scored,m.k),hitW=Math.max(m.barW,l.band);
     return <g key={m.scored.span.fromWave} className={s.mark}>
      <rect className={`${s.rangeBar} ${s.lit}`} x={m.cx-m.barW/2} y={m.barTop} width={m.barW} height={Math.max(1,m.barBottom-m.barTop)} rx={3}/>
      <line className={s.meanTick} x1={m.cx-m.barW/2} x2={m.cx+m.barW/2} y1={m.meanY} y2={m.meanY}/>
      <circle className={`${s.dotMark} ${s.lit}`} data-state={m.state} cx={m.cx} cy={m.dotY} r={DOT}/>
      <rect {...hit(lines,m.cx,Math.min(m.barTop,m.dotY-DOT))} x={m.cx-hitW/2} y={T} width={hitW} height={l.ph}/>
     </g>;
    })}
   </svg>
   <ChartTip tip={tip} width={width}/>
  </div>
  <ul className={s.legend}>
   <li><span className={`${s.swatch} ${s.swatchRange}`}/>Model's 80% range</li>
   <li><span className={`${s.swatch} ${s.dot} ${s.inside}`}/>Your gain, inside the range</li>
   <li><span className={`${s.swatch} ${s.dot} ${s.below}`}/>Below it: forecast too high</li>
   <li><span className={`${s.swatch} ${s.dot} ${s.above}`}/>Above it: forecast too low</li>
  </ul>
  <Disclosure summary="Show as a table">
   <table className={rc.table}>
    <thead><tr><th scope="col">Waves</th><th scope="col">You gained</th><th scope="col">Model's range</th><th scope="col">Model expected</th></tr></thead>
    <tbody>
     {run.scored.map(({span,pred})=><tr key={span.fromWave}>
      <th scope="row">{wavesText(span)}</th>
      <td data-label="You gained">{r(span.actual)}</td>
      <td data-label="Model's range">{r(pred.p10)}–{r(pred.p90)}</td>
      <td data-label="Model expected">{r(pred.mean)}</td>
     </tr>)}
    </tbody>
   </table>
  </Disclosure>
 </div>;
}
