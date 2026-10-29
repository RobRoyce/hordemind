import {useRef,useState} from 'react';
import {scaleLinear} from 'd3-scale';
import {area,curveLinear,curveMonotoneX,line} from 'd3-shape';
import type {RunScores} from '../../../analysis/analyze';
import {Disclosure} from '../../kit';
import {runDate} from '../RunHistory';
import rc from '../ReportCardSection.module.css';
import {ChartTip,useTip} from './ChartTip';
import {NARROW_BELOW,useChartWidth} from './useChartWidth';
import s from './charts.module.css';

const L=44,R=80,T=12,B=28,DOT=4.5,END_GAP=16;

export type Verdict='inside'|'below'|'above';
export interface FanDot{wave:number;total:number;cx:number;cy:number;verdict:Verdict|null;lines:string[]}

const r=Math.round;
const NOT_SCORED="Not scored, because Varshan's Vengeance (Lair Bosses War Plan) changes Chaos Waves";

/** Geometry of one run's fan: scales, ticks, path strings and one dot per reading. */
export function fanLayout(run:RunScores,width:number){
 const height=width<NARROW_BELOW?240:300;
 const last=Math.max(1,run.fan.at(-1)?.wave??run.totalWaves);
 const x=scaleLinear().domain([0,last]).range([L,width-R]);
 const top=Math.max(0,...run.fan.map(f=>f.p90),...run.readings.map(d=>d.total));
 const y=scaleLinear().domain([0,top||1]).range([height-B,T]).nice();
 const ticks=y.ticks(4);
 const band=(width-L-R)/last,every=band>=22?1:band>=11?2:5;
 const waves=[0,...Array.from({length:last},(_,i)=>i+1).filter(w=>w%every===0||w===1)];
 const fx=(d:{wave:number})=>x(d.wave);
 const bandPath=(lo:'p10'|'p25',hi:'p90'|'p75')=>area<typeof run.fan[number]>().x(fx).y0(d=>y(d[lo])).y1(d=>y(d[hi])).curve(curveMonotoneX)(run.fan)??'';
 const mean=line<typeof run.fan[number]>().x(fx).y(d=>y(d.mean)).curve(curveMonotoneX)(run.fan)??'';
 const you=line<{wave:number;total:number}>().x(fx).y(d=>y(d.total)).curve(curveLinear)([{wave:0,total:0},...run.readings])??'';
 const dots:FanDot[]=run.readings.map(({wave,total})=>{
  const f=run.fan.find(p=>p.wave===wave)??run.fan.at(-1)??{wave,mean:0,p10:0,p25:0,p75:0,p90:0};
  const sc=run.scored.find(c=>c.span.toWave===wave);
  const verdict:Verdict|null=sc?(sc.span.actual<sc.pred.p10?'below':sc.span.actual>sc.pred.p90?'above':'inside'):null;
  const {fromWave}=sc?.span??{fromWave:wave};
  const verdictLine=!sc?NOT_SCORED
   :(fromWave===wave?"This reading's gain was ":`The gain over waves ${fromWave}–${wave} was `)+`${verdict} the model's range`;
  return {wave,total,cx:x(wave),cy:y(total),verdict,
   lines:[`You had ${r(total)} Aether`,`After wave ${wave}`,`Model expected about ${r(f.mean)}`,`80% range ${r(f.p10)}–${r(f.p90)}`,verdictLine]};
 });
 const lastTotal=run.readings.at(-1)?.total??0,lastMean=run.fan.at(-1)?.mean??0;
 let yYou=y(lastTotal)+4,yModel=y(lastMean)+4;
 if(Math.abs(yYou-yModel)<END_GAP){
  const mid=(yYou+yModel)/2,up=yYou<yModel;
  yYou=mid+(up?-END_GAP/2:END_GAP/2);yModel=mid+(up?END_GAP/2:-END_GAP/2);
 }
 const lo=T+10,hi=height-B-2,youAbove=yYou<=yModel;
 let upper=Math.min(yYou,yModel),lower=Math.max(yYou,yModel);
 if(upper<lo){upper=lo;lower=Math.max(lower,lo+END_GAP)}
 if(lower>hi){lower=hi;upper=Math.min(upper,hi-END_GAP)}
 [yYou,yModel]=youAbove?[upper,lower]:[lower,upper];
 const xs=run.readings.map(d=>x(d.wave));
 const hits=xs.map((cx,k)=>{
  const a=k>0?(xs[k-1]!+cx)/2:x(0),b=k<xs.length-1?(cx+xs[k+1]!)/2:width-R;
  return {x:a,width:b-a};
 });
 return {width,height,ticks,waves,x:(w:number)=>x(w),y:(v:number)=>y(v),outer:bandPath('p10','p90'),inner:bandPath('p25','p75'),mean,you,dots,hits,
  endX:x(last)+8,endYou:{y:yYou,text:`You ${r(lastTotal)}`},endModel:{y:yModel,text:`Model ${r(lastMean)}`}};
}

const gainText=(v:Verdict|null)=>v?`${v==='inside'?'Inside':v==='below'?'Below':'Above'} the range`:'Not scored';

/** The model's running-total range from the start of the run against the Aether read, one run at a time. */
export function FanChart({runs}:{runs:RunScores[]}){
 return runs.length?<Fan runs={runs}/>:null;
}

function Fan({runs}:{runs:RunScores[]}){
 const [at,setAt]=useState(0);
 const ref=useRef<HTMLDivElement>(null);
 const width=useChartWidth(ref);
 const {tip,hit,clear}=useTip();
 const i=Math.min(at,runs.length-1),run=runs[i]!;
 const l=fanLayout(run,width),label=`Run of ${runDate(run.createdAt)}, ${runs.length-i} of ${runs.length}`;
 const go=(to:number)=>{clear();setAt(to)};
 return <div className={s.block}>
  <h3 className={s.title}>Wave by wave</h3>
  <p className={s.note}>The band is what the model expected for your running total, given the offers you took. Dots are your Aether readings. Hover or focus one to compare that reading's gain with the model.</p>
  <div className={s.stepper}>
   <button type="button" className={s.step} aria-label="Earlier run" disabled={i>=runs.length-1} onClick={()=>go(i+1)}>‹</button>
   <span aria-live="polite">{label}</span>
   <button type="button" className={s.step} aria-label="Later run" disabled={i<=0} onClick={()=>go(i-1)}>›</button>
  </div>
  <div ref={ref} className={s.wrap}>
   <svg className={s.svg} width={width} height={l.height} viewBox={`0 0 ${width} ${l.height}`} role="group" aria-label={`Wave by wave, ${label}`}>
    {l.ticks.map(v=><g key={v}>
     <line className={s.grid} x1={L} x2={width-R} y1={l.y(v)} y2={l.y(v)}/>
     {v!==0&&<text className={s.axis} x={L-8} y={l.y(v)+4} textAnchor="end">{v}</text>}
    </g>)}
    {l.waves.map(w=><text key={w} className={s.axis} x={l.x(w)} y={l.height-8} textAnchor="middle">{w===0?'Start':w}</text>)}
    <path className={s.fanOuter} d={l.outer}/>
    <path className={s.fanInner} d={l.inner}/>
    <path className={s.fanMean} d={l.mean}/>
    <path className={s.fanYou} d={l.you}/>
    {tip&&<line className={s.cross} x1={tip.x} x2={tip.x} y1={T} y2={l.height-B}/>}
    {l.dots.map(d=><circle key={d.wave} className={s.fanDot} data-reading={d.wave} cx={d.cx} cy={d.cy} r={DOT}/>)}
    <text className={s.endLabel} x={l.endX} y={l.endYou.y}>{l.endYou.text}</text>
    <text className={s.endLabel} x={l.endX} y={l.endModel.y}>{l.endModel.text}</text>
    {tip&&<circle className={s.focusRing} cx={tip.x} cy={tip.y} r={8}/>}
    {l.dots.map((d,k)=>{
     const h=l.hits[k]!;
     return <rect key={d.wave} {...hit(d.lines,d.cx,d.cy)} className={s.fanHit} x={h.x} y={T} width={h.width} height={l.height-B-T}/>;
    })}
   </svg>
   <ChartTip tip={tip} width={width}/>
  </div>
  <ul className={s.legend}>
   <li><span className={`${s.swatch} ${s.swatchOuter}`}/>Model's 80% range</li>
   <li><span className={`${s.swatch} ${s.swatchInner}`}/>50% range</li>
   <li><span className={`${s.swatch} ${s.swatchMean}`}/>Model's expected total</li>
   <li><span className={`${s.swatch} ${s.swatchYou}`}/>Your total</li>
  </ul>
  <Disclosure summary="Show as a table">
   <table className={rc.table}>
    <thead><tr><th scope="col">Wave</th><th scope="col">You had</th><th scope="col">Model expected</th><th scope="col">80% range</th><th scope="col">This reading's gain</th></tr></thead>
    <tbody>
     {l.dots.map(d=>{
      const [, , expected, range]=d.lines;
      return <tr key={d.wave}>
       <th scope="row">{d.wave}</th>
       <td data-label="You had">{r(d.total)}</td>
       <td data-label="Model expected">{expected!.replace('Model expected about ','')}</td>
       <td data-label="80% range">{range!.replace('80% range ','')}</td>
       <td data-label="This reading's gain">{gainText(d.verdict)}</td>
      </tr>;
     })}
    </tbody>
   </table>
  </Disclosure>
 </div>;
}
