import {useRef} from 'react';
import type {ReportCard} from '../../../analysis/reportCard';
import {familySlug} from '../../kit';
import {missCell,percent} from '../insightsText';
import {ChartTip,useTip} from './ChartTip';
import {niceMax} from './scale';
import {NARROW_BELOW,useChartWidth} from './useChartWidth';
import s from './charts.module.css';

const TOP=22,R=8,ROOM=84,BAR_H=12;
const readings=(n:number)=>`${n} ${n===1?'reading':'readings'}`;

/** A bar with a square end on `x0` and a rounded far end, `len` long towards `dir`. */
function barPath(x0:number,cy:number,len:number,dir:1|-1,h=BAR_H){
 const r=Math.min(4,len/2),top=cy-h/2,d=dir;
 return `M ${x0} ${top} h ${d*(len-r)} q ${d*r} 0 ${d*r} ${r} v ${h-2*r} q 0 ${r} ${-d*r} ${r} h ${-d*(len-r)} z`;
}

/** Geometry of the miss chart: row positions, centre line and the scale in px per Aether. */
export function missLayout(families:ReportCard['byFamily'],width:number){
 const narrow=width<NARROW_BELOW,row=narrow?52:34,left=narrow?0:Math.min(150,width*.3);
 const pw=width-left-R,mid=left+pw/2,room=narrow?4:ROOM;
 const max=niceMax(Math.max(0,...families.map(f=>Math.abs(f.stats.averageMiss)))).max;
 return {narrow,row,left,mid,height:TOP+families.length*row+6,scale:(pw/2-room)/max};
}

/** How far the forecast missed on average after each offer family; right of centre is too much. */
export function MissBars({families}:{families:ReportCard['byFamily']}){
 return families.length?<Bars families={families}/>:null;
}

function Bars({families}:{families:ReportCard['byFamily']}){
 const ref=useRef<HTMLDivElement>(null);
 const width=useChartWidth(ref);
 const {tip,hit}=useTip();
 const l=missLayout(families,width);
 return <div>
  <h3 className={s.title}>After each offer family</h3>
  <p className={s.note}>How far the forecast missed per reading, on average, after you took each family's offers. Families with 5 readings or more.</p>
  <div ref={ref} className={s.wrap}>
   <svg className={s.svg} width={width} height={l.height} viewBox={`0 0 ${width} ${l.height}`} role="group" aria-label="After each offer family">
    <line className={s.centre} x1={l.mid} x2={l.mid} y1={TOP-6} y2={l.height-4}/>
    <text className={s.axis} x={l.mid-8} y={12} textAnchor="end">← too little</text>
    <text className={s.axis} x={l.mid+8} y={12}>too much →</text>
    {families.map(({family,stats},i)=>{
     const top=TOP+i*l.row,miss=stats.averageMiss,right=miss>0,word=missCell(miss);
     const len=Math.max(2,Math.abs(miss)*l.scale),ly=l.narrow?top+16:top+l.row/2+4,cy=l.narrow?top+34:top+l.row/2;
     const lines=[`${word} per reading`,`After ${family} offers`,`${readings(stats.readings)}, ${percent(stats.inRange,stats.readings)} inside the range`];
     return <g key={family} className={s.mark}>
      <path d={`M 10 ${ly-9} l 5 5 l -5 5 l -5 -5 z`} style={{fill:`var(--hm-fam-${familySlug(family)})`}}/>
      <text className={s.label} x={22} y={ly}>{family}<tspan className={s.value} dx={6}>{readings(stats.readings)}</tspan></text>
      <path className={`${right?s.missRight:s.missLeft} ${s.lit}`} data-side={right?'right':'left'} d={barPath(l.mid+(right?1:-1),cy,len,right?1:-1)}/>
      {l.narrow
       ?<text className={s.value} x={width-R} y={ly} textAnchor="end">{word}</text>
       :<text className={s.value} x={l.mid+(right?len+8:-len-8)} y={cy+4} textAnchor={right?'start':'end'}>{word}</text>}
      <rect {...hit(lines,l.mid+(right?len/2:-len/2),cy-BAR_H/2)} x={0} y={top} width={width} height={l.row}/>
     </g>;
    })}
   </svg>
   <ChartTip tip={tip} width={width}/>
  </div>
 </div>;
}
