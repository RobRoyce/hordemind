import {resolveOffer,type OfferFamily} from '../catalog';
import type {RunReadings,Span,SpanPrediction} from './replay';

/** A scored span with its prediction and the family of the offer taken before it. */
export interface Scored{span:Span;pred:SpanPrediction;family:OfferFamily|null}
export interface RangeStats{readings:number;inRange:number;averageMiss:number}
export interface ReportCard{buckets:RangeStats;calibrated:RangeStats|null;byFamily:{family:OfferFamily;stats:RangeStats}[]}

export const MIN_FAMILY_READINGS=5;

/** Pairs each scored span with its prediction, found by the span's index in `r.spans`. */
export function scoreRun(r:RunReadings,preds:readonly SpanPrediction[]):Scored[]{
 return r.scored.flatMap(span=>{
  const pred=preds[r.spans.indexOf(span)];
  if(!pred)return [];
  const last=r.waves[span.fromWave-1]?.stack.at(-1);
  return [{span,pred,family:(last===undefined?null:resolveOffer(last)?.family)??null}];
 });
}

/** In range means p10 <= actual <= p90. A positive miss means the model predicted too much. */
export function rangeStats(scored:readonly Scored[]):RangeStats{
 const n=scored.length;
 return {readings:n,inRange:scored.filter(s=>s.pred.p10<=s.span.actual&&s.span.actual<=s.pred.p90).length,
  averageMiss:n?scored.reduce((a,s)=>a+s.pred.mean-s.span.actual,0)/n:0};
}

export function reportCard(buckets:readonly Scored[],calibrated:readonly Scored[]|null):ReportCard{
 const groups=new Map<OfferFamily,Scored[]>();
 for(const s of buckets)if(s.family)groups.set(s.family,[...(groups.get(s.family)??[]),s]);
 const byFamily=[...groups].filter(([,g])=>g.length>=MIN_FAMILY_READINGS).sort((a,b)=>b[1].length-a[1].length).map(([family,g])=>({family,stats:rangeStats(g)}));
 return {buckets:rangeStats(buckets),calibrated:calibrated?rangeStats(calibrated):null,byFamily};
}
