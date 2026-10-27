import type {RunRecord} from '../domain/schema';
import {effectiveEvents} from '../domain/run';
import {resolveOffer} from '../catalog';
import {readRun} from './replay';

export interface Rate{hits:number;total:number}
export type OfferSetup='reign'|'chaos'|'neither';
export interface GameCounts{
 offers:Record<OfferSetup,{sets:number;counts:{offer:string;count:number}[]}>;
 repeats:{withMadness:Rate;withoutMadness:Rate};
 chaotic:{withTotalChaos:Rate;neither:Rate};
 varshan:{with:{median:number|null;count:number};without:{median:number|null;count:number}};
}

const CHAOTIC='The Chaotic Offering',VARSHAN="Varshan's Vengeance";
const median=(xs:number[])=>{
 if(!xs.length)return null;
 const s=[...xs].sort((a,b)=>a-b),m=s.length>>1;
 return s.length%2?s[m]!:(s[m-1]!+s[m]!)/2;
};

/** Plain tallies over recorded runs; no model involved. */
export function gameCounts(runs:readonly RunRecord[]):GameCounts{
 const tally:Record<OfferSetup,Map<string,number>>={reign:new Map(),chaos:new Map(),neither:new Map()};
 const sets:Record<OfferSetup,number>={reign:0,chaos:0,neither:0};
 const madness:Rate={hits:0,total:0},plain:Rate={hits:0,total:0},totalChaos:Rate={hits:0,total:0},neither:Rate={hits:0,total:0};
 const varshan={with:[] as number[],without:[] as number[]};
 for(const run of runs){
  const events=effectiveEvents(run),started=events.find(e=>e.type==='run_started');
  if(!started||started.type!=='run_started')continue;
  const nodes=started.payload.profile.warPlanNodes;
  const setup:OfferSetup=nodes.includes('Reign in Hell')?'reign':nodes.includes('Total Chaos')?'chaos':'neither';
  const repeatRate=nodes.includes('Method and Madness')?madness:plain;
  // the latest presented set per wave and the pick made from it
  const presented=new Map<number,{offered:string[];special?:number}>(),picked=new Map<number,string>();
  for(const e of events){
   if(e.type==='offers_presented')presented.set(e.payload.wave,{offered:e.payload.offered,...(e.payload.specialSlotIndex!==undefined?{special:e.payload.specialSlotIndex}:{})});
   else if(e.type==='offer_chosen')picked.set(e.payload.wave,e.payload.chosen);
  }
  for(const [wave,set] of presented){
   sets[setup]++;
   const labels=set.offered.map(n=>resolveOffer(n)?.label??n.trim());
   for(const l of labels)tally[setup].set(l,(tally[setup].get(l)??0)+1);
   if(setup!=='reign'){
    const rate=setup==='chaos'?totalChaos:neither;
    rate.total++;
    if(labels.includes(CHAOTIC))rate.hits++;
   }
   const prev=wave>=2?picked.get(wave-1):undefined,family=prev===undefined?undefined:resolveOffer(prev)?.family;
   // a Chaos slot always follows a Chaos pick, so it says nothing about repeats
   if(family===undefined||family==='Chaos')continue;
   repeatRate.total++;
   if(set.offered.some((n,i)=>i!==set.special&&resolveOffer(n)?.family===family))repeatRate.hits++;
  }
  const r=readRun(run),bucket=r.lairBossNodes.includes(VARSHAN)?varshan.with:varshan.without;
  for(const s of r.spans)if(s.fromWave===s.toWave&&s.chaos)bucket.push(s.actual);
 }
 const ranked=(m:Map<string,number>)=>[...m].map(([offer,count])=>({offer,count})).sort((a,b)=>b.count-a.count||a.offer.localeCompare(b.offer));
 const offers=Object.fromEntries((['reign','chaos','neither'] as const).map(k=>[k,{sets:sets[k],counts:ranked(tally[k])}])) as GameCounts['offers'];
 return {offers,repeats:{withMadness:madness,withoutMadness:plain},chaotic:{withTotalChaos:totalChaos,neither},
  varshan:{with:{median:median(varshan.with),count:varshan.with.length},without:{median:median(varshan.without),count:varshan.without.length}}};
}
