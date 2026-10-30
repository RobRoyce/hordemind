import {useRef,useState} from 'react';
import type {GameCounts,OfferSetup} from '../../../analysis/counts';
import {resolveOffer} from '../../../catalog';
import {familySlug,Segmented} from '../../kit';
import {offerSetLabel,percent} from '../insightsText';
import {ChartTip,useTip} from './ChartTip';
import {niceMax} from './scale';
import {NARROW_BELOW,useChartWidth} from './useChartWidth';
import s from './charts.module.css';

const TOP_OFFERS=10,BAR_H=8,VALUE_ROOM=48,R=8;
const SETUPS:{value:OfferSetup;label:string}[]=[{value:'neither',label:'Neither'},{value:'chaos',label:'Total Chaos'},{value:'reign',label:'Reign in Hell'}];
const sets=(n:number)=>`${n} ${n===1?'set':'sets'}`;
const times=(n:number)=>`${n} ${n===1?'time':'times'}`;

/** The share of offer sets that included each of the most common offers, for one offer setup at a time. */
export function OfferBars({offers}:{offers:GameCounts['offers']}){
 const options=SETUPS.filter(o=>offers[o.value].sets>0).map(o=>({...o,detail:sets(offers[o.value].sets)}));
 return options.length?<Bars offers={offers} options={options}/>:null;
}

function Bars({offers,options}:{offers:GameCounts['offers'];options:{value:OfferSetup;label:string;detail:string}[]}){
 const [pick,setPick]=useState<OfferSetup|null>(null);
 const ref=useRef<HTMLDivElement>(null);
 const width=useChartWidth(ref);
 const {tip,hit,clear}=useTip();
 const biggest=options.reduce((a,o)=>offers[o.value].sets>offers[a.value].sets?o:a).value;
 const setup=options.some(o=>o.value===pick)?pick!:biggest;
 const {sets:total,counts}=offers[setup],rows=counts.slice(0,TOP_OFFERS);
 const narrow=width<NARROW_BELOW,row=narrow?44:28,T=4,height=T+rows.length*row;
 const nameW=narrow?0:Math.min(220,width*.4),barX=narrow?22:nameW,span=width-barX-R-VALUE_ROOM;
 const {max}=niceMax(Math.min(100,rows.length?100*rows[0]!.count/total:0));
 const where=offers.reign.sets>0||offers.chaos.sets>0;
 return <div className={s.block}>
  <h3 className={s.title}>How often each offer appeared</h3>
  <p className={s.note}>Share of offer sets that included each offer. Top 10.</p>
  {options.length>1&&<div className={s.setups}><Segmented label="Offer setup" value={setup} options={options} onChange={v=>{clear();setPick(v)}}/></div>}
  <p className={s.setupNote}>{offerSetLabel(setup,total)}.{where&&' Reign in Hell and Total Chaos sit either side of the row below Method and Madness in the Infernal Hordes War Plan.'}</p>
  <div ref={ref} className={s.wrap}>
   <svg className={s.svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="How often each offer appeared">
    {rows.map(({offer,count},i)=>{
     const top=T+i*row,pct=100*count/total,family=resolveOffer(offer)?.family??null;
     const ly=narrow?top+14:top+row/2+4,by=narrow?top+24:top+row/2-BAR_H/2;
     const len=Math.max(3,Math.min(pct,100)/max*span),r=Math.min(4,BAR_H/2);
     const lines=[`${percent(count,total)} of ${total} offer sets`,offer,`Appeared ${times(count)}`];
     return <g key={offer} className={s.mark}>
      {family&&<path d={`M 10 ${ly-9} l 5 5 l -5 5 l -5 -5 z`} style={{fill:`var(--hm-fam-${familySlug(family)})`}}/>}
      <text className={s.label} x={22} y={ly}>{offer}</text>
      <path className={`${s.offerBar} ${s.lit}`} data-bar="" d={`M ${barX} ${by} h ${len-r} q ${r} 0 ${r} ${r} v ${BAR_H-2*r} q 0 ${r} ${-r} ${r} h ${-(len-r)} z`}/>
      <text className={s.value} x={barX+len+8} y={by+BAR_H/2+4}>{percent(count,total)}</text>
      <rect {...hit(lines,barX+len/2,by)} x={0} y={top} width={width} height={row}/>
     </g>;
    })}
   </svg>
   <ChartTip tip={tip} width={width}/>
  </div>
 </div>;
}
