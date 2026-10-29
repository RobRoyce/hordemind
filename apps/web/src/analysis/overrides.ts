import type {RunRecord} from '../domain/schema';
import {effectiveEvents} from '../domain/run';
import {offerGap,type Scenario} from '../recommendation/model';
import {playerProfile} from '../recommendation/scenario';
import type {Scored} from './reportCard';

/** `scored` is null for runs left out of scoring. */
export interface OverrideInput{run:RunRecord;scored:readonly Scored[]|null}
/** Prices recommendation minus choice; `runId` lets a caller cache per run. */
export type Price=(s:Scenario,a:string,b:string,samples:number,runId:string)=>number|null;
interface Ranked{offer:string;count:number}
export interface OverrideSummary{
 tookDefault:number;pickedSame:number;tookOther:number;
 cost:{total:number;average:number;priced:number}|null;
 forecastGap:{average:number;spans:number}|null;
 pickedAgainst:Ranked[];skippedRecommendations:Ranked[];
 /** Choices recorded without a recommendation or choice source. */
 skippedOlder:number;
 /** Runs with an override whose Aether could not be scored. */
 gapLeftOut:number;
}

const TOP=3;
const top=(counts:Map<string,number>):Ranked[]=>[...counts].map(([offer,count])=>({offer,count})).sort((a,b)=>b.count-a.count||a.offer.localeCompare(b.offer)).slice(0,TOP);
const bump=(m:Map<string,number>,k:string)=>m.set(k,(m.get(k)??0)+1);

/** Groups recorded choices by how they met the recommendation and prices the disagreements. */
export function overrideSummary(inputs:readonly OverrideInput[],samples:number,price:Price=offerGap):OverrideSummary{
 let skippedOlder=0,gapLeftOut=0,tookDefault=0,pickedSame=0,tookOther=0,costTotal=0,priced=0,gapTotal=0,gapSpans=0;
 const against=new Map<string,number>(),skipped=new Map<string,number>();
 for(const {run,scored} of inputs){
  const events=effectiveEvents(run);
  const started=events.find(e=>e.type==='run_started');
  if(!started||started.type!=='run_started')continue;
  const {profile:snap,totalWaves}=started.payload;
  const choices=events.flatMap(e=>e.type==='offer_chosen'?[e.payload]:[]).sort((a,b)=>a.wave-b.wave);
  let firstOverride=Infinity;
  for(const c of choices){
   if(c.recommendedOffer===null||c.choiceSource===null){skippedOlder++;continue}
   if(c.choiceSource==='default'){tookDefault++;continue}
   if(c.chosen===c.recommendedOffer){pickedSame++;continue}
   tookOther++;
   firstOverride=Math.min(firstOverride,c.wave);
   bump(against,c.chosen);bump(skipped,c.recommendedOffer);
   const gap=price({history:choices.filter(x=>x.wave<c.wave).map(x=>x.chosen),totalWaves,decisionWave:c.wave,profile:playerProfile(snap)},c.recommendedOffer,c.chosen,samples,run.id);
   if(gap!==null){costTotal+=gap;priced++}
  }
  if(firstOverride<Infinity&&!scored)gapLeftOut++;
  // spans starting at or after the first override count once per run
  if(scored)for(const s of scored)if(s.span.fromWave>=firstOverride){gapTotal+=s.span.actual-s.pred.mean;gapSpans++}
 }
 return {tookDefault,pickedSame,tookOther,
  cost:priced?{total:costTotal,average:costTotal/priced,priced}:null,
  forecastGap:gapSpans?{average:gapTotal/gapSpans,spans:gapSpans}:null,
  pickedAgainst:top(against),skippedRecommendations:top(skipped),skippedOlder,gapLeftOut};
}
