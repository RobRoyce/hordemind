/**
 * Ranks the offers on screen by modeled marginal Aether over the remaining waves.
 *
 * Gains compare each offer against an offer with no effect, using paired seeds. The
 * simulator charges every event against the wave's time budget (simulate.ts). Unmodeled
 * offers are reported as such and never scored as zero.
 */
import type {CharacterProfile} from '../domain/schema';
import {BASE,mechanicsFor,MECHANICS,type Effect,type EventKind,type Param} from './mechanics';
import {simulateRun,hash,emptyBreakdown,type Assumptions,type Breakdown,BASELINE} from './simulate';

export const RECOMMENDER_VERSION='s15-timeflow-3.0-experimental';

/** `decisionWave` is the wave the offer precedes; the chosen offer applies from that wave on. */
export interface Scenario{
 history:string[];totalWaves:number;decisionWave:number;
 profile:Pick<CharacterProfile,'killSpeed'|'mobility'|'warPlanNodes'>;
}
export const remainingWaves=(s:Pick<Scenario,'totalWaves'|'decisionWave'>)=>Math.max(0,s.totalWaves-s.decisionWave+1);
export const hasMechanics=(name:string)=>mechanicsFor(name)!==null;

export interface SensitivityResult{name:string;mean:number}
/** "A later {offer} would be worth {withThis} instead of {without}." */
export interface Synergy{offer:string;withThis:number;without:number}
export interface Estimate{
 offer:string;modeled:true;mean:number;low:number;high:number;components:Breakdown;
 reasons:string[];assumptions:string[];sensitivity:SensitivityResult[];synergies:Synergy[];
}
export interface Unsupported{offer:string;modeled:false;reason:string}
export type OfferAssessment=Estimate|Unsupported;
export interface PactAdvice{offer:string;premium:number;bestRegular:string|null;remaining:number;advice:string}
export interface Comparison{
 assessments:OfferAssessment[];recommended:string|null;conditional:boolean;samples:number;modelVersion:string;warnings:string[];
 /** True when the same offer wins under every assumption set; null when not checked. */
 robust:boolean|null;
 pact:PactAdvice|null;
}
export interface CompareOptions{specialOffer?:string|null;sensitivity?:boolean;synergy?:boolean}

const SENSITIVITY:readonly (Assumptions&{name:string})[]=[
 {name:'Events take 40% longer',completionScale:1.4,fillScale:1},
 {name:'Events are 30% quicker',completionScale:0.7,fillScale:1},
 {name:'Aether Events spawn 40% slower',completionScale:1,fillScale:1.4}
];
const SAMPLE_SEED=0x15a4b4;
const sum=(b:Breakdown)=>Object.values(b).reduce((a,v)=>a+v,0);

interface Draws{mean:number;low:number;high:number;components:Breakdown}
function marginal(s:Scenario,offer:string,samples:number,assumptions:Assumptions=BASELINE,history=s.history,remaining=remainingWaves(s)):Draws{
 const draws:number[]=[],components=emptyBreakdown();
 for(let i=0;i<samples;i++){
  const seed=hash(SAMPLE_SEED+i*9733);
  const after=simulateRun(history,offer,remaining,s.profile,seed,assumptions);
  const before=simulateRun(history,null,remaining,s.profile,seed,assumptions);
  draws.push(sum(after)-sum(before));
  for(const k of Object.keys(components) as EventKind[])components[k]+=(after[k]-before[k])/samples;
 }
 draws.sort((a,b)=>a-b);
 const mean=draws.reduce((a,b)=>a+b,0)/samples;
 return {mean,low:draws[Math.floor(samples*.05)]??mean,high:draws[Math.min(samples-1,Math.floor(samples*.95))]??mean,components};
}

const pct=(p:number)=>Math.round(p*100)+'%';
const SOURCE:Record<EventKind,string>={Mass:'Masses',Fiend:'Fiends',Lord:'Lords',Spire:'Spires',Hellborne:'Hellborne',Goblin:'Goblins',Butcher:'the Butcher',Hellfire:'wave-end Hellfire',Chaos:'the Chaos Wave'};
const parts=(list:[string,number][])=>list.slice(0,2).map(([k,v])=>`${SOURCE[k as EventKind]} (${v<0?'−':'+'}${Math.abs(Math.round(v))})`).join(' and ');
const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
function describe(e:Effect):string|null{
 switch(e.kind){
  case 'puffing':return 'Every Mass pays +1 Aether per offer in your stack, with Mass offers counting twice. Your stack grows by one offer each wave, so this keeps rising.';
  case 'startEvents':return e.firstWaveOnly?`Adds ${plural(e.count.value,e.event==='Butcher'?'Burning Butcher':e.event)} in the next wave.`:`Adds ${plural(e.count.value,e.event)} at the start of every wave.`;
  case 'onComplete':return e.from===e.spawn?`Each ${e.from} has a ${pct(e.chance.value)} chance to reform when killed.`:`Each ${e.from} you kill has a ${pct(e.chance.value)} chance to spawn ${e.spawn==='Hellborne'?'Hellborne':'a '+e.spawn}.`;
  case 'withEvents':return `Each Aether Event has a ${pct(e.chance.value)} chance to bring ${e.spawn==='Hellborne'?'Hellborne':'a '+e.spawn}.`;
  case 'payoutAdd':return `+${e.amount.value} Aether per ${e.event}.`;
  case 'payoutMult':return `${e.factor.value}× Aether from each ${e.event}.`;
  case 'weightMult':return e.factor.value<1?`${e.event}s appear ${pct(e.factor.value)} as often.`:`${e.event}s appear more often.`;
  case 'eventRate':return `Aether Events spawn ${pct(e.add.value)} faster.`;
  case 'timeMult':return `${e.event}s take ${e.factor.value}× as long to kill.`;
  case 'convert':return `${e.from}s spawn as ${e.to}s worth ${e.payoutFactor.value}× Aether.`;
  case 'groupAdd':return `+${e.count.value} ${e.event} per spawn.`;
  case 'waveEnd':return `${e.min.value}–${e.max.value} Aether at the end of each wave.`;
  case 'hellfireSpawns':return 'Hellfire spawns Hellborne, so it pays most with a Hellfire source such as Burning Rain.';
  case 'hellfireSource':return null;
  case 'chaos':return null;
 }
}

/** Events an offer pays more for, but cannot create by itself. */
function payoffOnly(offer:string):EventKind|null{
 const m=mechanicsFor(offer);
 if(!m)return null;
 const adds=m.effects.filter(e=>e.kind==='payoutAdd'||e.kind==='payoutMult');
 const spawns=m.effects.some(e=>['startEvents','onComplete','withEvents','hellfireSpawns','groupAdd','convert'].includes(e.kind));
 return adds.length&&!spawns?(adds[0] as {event:EventKind}).event:null;
}

function explain(offer:string,s:Scenario,d:Draws):string[]{
 const m=mechanicsFor(offer)!,remain=remainingWaves(s),reasons:string[]=[];
 const gains=Object.entries(d.components).filter(([,v])=>v>=1).sort((a,b)=>b[1]-a[1]);
 const losses=Object.entries(d.components).filter(([,v])=>v<=-1).sort((a,b)=>a[1]-b[1]);
 const puffing=s.history.some(x=>mechanicsFor(x)?.effects.some(e=>e.kind==='puffing'));
 const payoff=payoffOnly(offer);

 if(m.category==='Chaos'){
  reasons.push('Replaces the next wave with one random Chaos Wave. You cannot pick which; the model averages over the possible types.');
  if(s.profile.warPlanNodes.includes('Bedlam'))reasons.push('Includes your Bedlam bonus for entering a Chaos Wave.');
 }else if(payoff&&Math.abs(d.mean)<1&&(d.components[payoff]??0)<1){
  reasons.push(`Nothing in your stack spawns ${payoff==='Hellborne'?'Hellborne':payoff+'s'} often enough yet, so this adds about nothing now.`);
 }else if(puffing&&m.category!=='Masses'&&d.components.Mass>=d.mean/2&&d.components.Mass>=1){
  reasons.push(`Most of this value is extra Mass Aether (+${Math.round(d.components.Mass)}), boosted by your Puffing Masses.`);
 }else if(gains.length){
  reasons.push(`Mostly from ${parts(gains)} over ${plural(remain,'wave')}.`);
 }
 if(losses.length)reasons.push(`Time spent on its events costs you Aether from ${parts(losses)}.`);
 const effects=m.effects.map(describe).filter((x):x is string=>x!==null);
 if(effects.length)reasons.push(effects.join(' '));
 if(remain===0)reasons.push('No waves remain after this pick.');
 return reasons;
}

function provenanceNotes(offer:string):string[]{
 const m=mechanicsFor(offer)!,notes:string[]=[];
 if(!m.nameConfirmed)notes.push('This offer name is not in current guides; its effect is a guess.');
 const params=m.effects.flatMap(e=>Object.values(e).filter((v):v is Param=>typeof v==='object'&&v!==null&&'provenance' in v));
 const doubtful=params.filter(p=>p.provenance!=='guide');
 if(doubtful.length)notes.push(...doubtful.map(p=>`${p.provenance==='disputed'?'Disputed':'Assumed'}: ${p.note??p.value}.`));
 else if(params.length)notes.push('Effect values match current guides but are not verified in game.');
 return notes;
}
const GLOBAL_ASSUMPTIONS=[
 `Event spawn rate, event mix, travel and kill times are assumptions (for example ${BASE.fillSeconds.value} s of demon-killing per Aether Event), not measurements.`,
 'Gains compare each offer with an offer that has no effect. Later picks count toward your stack size but nothing else.',
 'Ranges show spread across simulated runs, not calibrated confidence intervals.'
];

function synergiesFor(offer:string,s:Scenario):Synergy[]{
 const m=mechanicsFor(offer),remain=remainingWaves(s)-1;
 if(!m?.complements||remain<1)return [];
 const out:Synergy[]=[];
 for(const k of m.complements){
  if(k===offer||s.history.includes(k)||!mechanicsFor(k))continue;
  const withThis=marginal(s,k,120,BASELINE,[...s.history,offer],remain).mean;
  const without=marginal(s,k,120,BASELINE,s.history,remain).mean;
  if(withThis-without>=5)out.push({offer:k,withThis,without});
 }
 return out.sort((a,b)=>(b.withThis-b.without)-(a.withThis-a.without)).slice(0,2);
}

function pactAdvice(special:string,modeled:Estimate[],s:Scenario):PactAdvice|null{
 const pact=modeled.find(x=>x.offer===special);
 if(!pact)return null;
 const regular=modeled.filter(x=>x.offer!==special).sort((a,b)=>b.mean-a.mean)[0]??null;
 const premium=pact.mean-(regular?.mean??0),remaining=remainingWaves(s);
 const advice=remaining<=1?'This is the last wave, so the Pact has no later use. Take its offer if it is your best option.':
  premium<=0?`${regular?.offer??'A regular offer'} is worth at least as much here, so keep the Pact for a later wave.`:
  `Using the Pact here gains about +${Math.round(premium)} over your best regular offer${regular?` (${regular.offer})`:''}. Save it only if you expect a later Pact offer to beat that wave's best regular offer by more, with fewer waves left to pay off. Guides say Pact offers match the category of your previous pick.`;
 return {offer:special,premium,bestRegular:regular?.offer??null,remaining,advice};
}

export function compareScenario(s:Scenario,candidates:string[],samples=400,options:CompareOptions={}):Comparison{
 const n=Math.max(60,Math.min(1600,Math.round(samples)));
 const unique=[...new Set(candidates.map(x=>x.trim()).filter(Boolean))];
 const modeled:Estimate[]=[],unknown:Unsupported[]=[];
 for(const offer of unique){
  if(!hasMechanics(offer)){
   unknown.push({offer,modeled:false,reason:'The simulator does not represent this offer yet. That is not an estimate of +0 Aether.'});
   continue;
  }
  const d=marginal(s,offer,n);
  modeled.push({offer,modeled:true,...d,reasons:explain(offer,s,d),assumptions:provenanceNotes(offer),sensitivity:[],
   synergies:options.synergy===false?[]:synergiesFor(offer,s)});
 }
 modeled.sort((a,b)=>b.mean-a.mean);
 let robust:boolean|null=null;
 if(options.sensitivity!==false&&modeled.length>1){
  const alt=Math.max(60,Math.round(n/2));
  for(const set of SENSITIVITY)for(const e of modeled)e.sensitivity.push({name:set.name,mean:marginal(s,e.offer,alt,set).mean});
  const best=modeled[0]!.offer;
  robust=SENSITIVITY.every((_,i)=>modeled.every(e=>e.offer===best||e.sensitivity[i]!.mean<=modeled[0]!.sensitivity[i]!.mean));
 }
 const special=options.specialOffer?.trim()||null;
 return {
  assessments:[...modeled,...unknown],recommended:modeled[0]?.offer??null,conditional:unknown.length>0,samples:n,modelVersion:RECOMMENDER_VERSION,
  robust,pact:special?pactAdvice(special,modeled,s):null,
  warnings:[
   ...(unknown.length?['Some offers are not modeled, so the best modeled offer may not be the best offer.']:[]),
   ...(robust===false?['The best offer changes under other plausible assumptions about event timing; treat this as a close call.']:[]),
   ...GLOBAL_ASSUMPTIONS
  ]
 };
}

/** Offers the simulator models, for coverage reporting. */
export const MODELED_OFFERS=MECHANICS.map(m=>m.id);
