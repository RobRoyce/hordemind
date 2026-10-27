/**
 * Ranks the offers on screen by modeled marginal Aether over the remaining waves.
 *
 * Gains compare each offer against an offer with no effect, using paired seeds. The
 * simulator charges every event against the wave's time budget (simulate.ts). Unmodeled
 * offers are reported as such and never scored as zero.
 */
import type {CharacterProfile} from '../domain/schema';
import {BASE,mechanicsFor,MECHANICS,WAR_PLAN_EFFECTS,type Effect,type EventKind,type Param} from './mechanics';
import {simulateRun,hash,emptyBreakdown,type Assumptions,type Breakdown,BASELINE} from './simulate';

export const RECOMMENDER_VERSION='s15-timeflow-3.1-experimental';

/** `decisionWave` is the wave the offer precedes; the chosen offer applies from that wave on. */
export interface Scenario{
 history:string[];totalWaves:number;decisionWave:number;
 profile:Pick<CharacterProfile,'killSpeed'|'mobility'|'warPlanNodes'>&{terrorRank?:number|null};
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
/** `premium` is null when the comparison cannot be priced, e.g. an offer is unmodeled. */
export interface PactAdvice{offer:string;premium:number|null;bestRegular:string|null;remaining:number;advice:string}
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

/** `noise` is each component's standard error across samples. */
interface Draws{mean:number;low:number;high:number;components:Breakdown;noise:Breakdown}
function marginal(s:Scenario,offer:string,samples:number,assumptions:Assumptions=BASELINE,history=s.history,remaining=remainingWaves(s)):Draws{
 const draws:number[]=[],components=emptyBreakdown(),squares=emptyBreakdown();
 for(let i=0;i<samples;i++){
  const seed=hash(SAMPLE_SEED+i*9733);
  const after=simulateRun(history,offer,remaining,s.profile,seed,assumptions);
  const before=simulateRun(history,null,remaining,s.profile,seed,assumptions);
  draws.push(sum(after)-sum(before));
  for(const k of Object.keys(components) as EventKind[]){const d=after[k]-before[k];components[k]+=d/samples;squares[k]+=d*d}
 }
 draws.sort((a,b)=>a-b);
 const mean=draws.reduce((a,b)=>a+b,0)/samples;
 const noise=emptyBreakdown();
 for(const k of Object.keys(noise) as EventKind[])noise[k]=Math.sqrt(Math.max(0,squares[k]/samples-components[k]**2)/samples);
 return {mean,low:draws[Math.floor(samples*.05)]??mean,high:draws[Math.min(samples-1,Math.floor(samples*.95))]??mean,components,noise};
}

const pct=(p:number)=>Math.round(p*100)+'%';
const SOURCE:Record<EventKind,string>={Mass:'Masses',Fiend:'Fiends',Lord:'Lords',Spire:'Spires',Hellborne:'Hellborne',Goblin:'Goblins',Butcher:'the Butcher',Hellfire:'wave-end Hellfire',Chaos:'the Chaos Wave',Council:'the Council'};
const parts=(list:[string,number][])=>list.slice(0,2).map(([k,v])=>`${SOURCE[k as EventKind]} (${v<0?'−':'+'}${Math.abs(Math.round(v))})`).join(' and ');
const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
const NAMES:Record<EventKind,readonly [string,string]>={Mass:['Mass','Masses'],Fiend:['Aether Fiend','Aether Fiends'],Lord:['Aether Lord','Aether Lords'],
 Spire:['Soulspire','Soulspires'],Hellborne:['Hellborne','Hellborne'],Goblin:['Goblin','Goblins'],Butcher:['Burning Butcher','Burning Butchers'],
 Hellfire:['Hellfire','Hellfire'],Chaos:['Chaos Wave','Chaos Waves'],Council:['Council fight','Council fights']};
const one=(k:EventKind)=>NAMES[k][0],many=(k:EventKind)=>NAMES[k][1];
const count=(n:number,k:EventKind)=>`${n} ${n===1?one(k):many(k)}`;
const a=(k:EventKind|'AetherEvent')=>k==='AetherEvent'?'an Aether Event':k==='Hellborne'?'Hellborne':(/^[AEIOU]/.test(one(k))?'an ':'a ')+one(k);
function describe(e:Effect):string|null{
 switch(e.kind){
  case 'puffing':return 'Every Mass pays +1 Aether per offer in your stack, with Mass offers counting twice. Your stack grows by one offer each wave, so this keeps rising.';
  case 'startEvents':return e.firstWaveOnly?`Adds ${count(e.count.value,e.event)} in the next wave.`:`Adds ${count(e.count.value,e.event)} at the start of every wave.`;
  case 'onComplete':return e.from===e.spawn?`Each ${one(e.from)} has a ${pct(e.chance.value)} chance to reform when killed.`:`Each ${one(e.from)} you kill has a ${pct(e.chance.value)} chance to spawn ${a(e.spawn)}.`;
  case 'withEvents':return `Each Aether Event has a ${pct(e.chance.value)} chance to bring ${a(e.spawn)}.`;
  case 'replaceElites':return `Some elites spawn as ${many(e.spawn)} instead, adding ${one(e.spawn)} Aether without costing event time.`;
  case 'payoutAdd':return `+${e.amount.value} Aether per ${one(e.event)}.`;
  case 'payoutMult':return `${e.factor.value}× Aether from each ${one(e.event)}.`;
  case 'weightMult':return e.factor.value<1?`${many(e.event)} appear ${pct(e.factor.value)} as often.`:`${many(e.event)} appear more often.`;
  case 'eventRate':return `Aether Events spawn ${pct(e.add.value)} faster.`;
  case 'timeMult':return `${many(e.event)} take ${e.factor.value}× as long to kill.`;
  case 'convert':return `${many(e.from)} spawn as ${many(e.to)} worth ${e.payoutFactor.value}× Aether.`;
  case 'groupAdd':return `+${e.count.value} ${one(e.event)} per spawn.`;
  case 'waveEnd':return `${e.min.value}–${e.max.value} Aether at the end of each wave.`;
  case 'hellfireSpawns':return 'Hellfire spawns Hellborne, so it pays most with a Hellfire source such as Burning Rain.';
  case 'hellfireSource':return null;
  case 'chaos':return null;
  case 'weightAdd':return `${many(e.event)} start appearing among Aether Events.`;
  case 'eliteRate':return `Elites spawn ${e.factor.value}× as often.`;
  case 'timeAdd':return `Each ${one(e.event)} kill costs about ${e.seconds.value} s more.`;
  case 'once':return e.event==='Council'?`+${e.amount.value} Aether once, when you defeat the Council.`:`+${e.amount.value} Aether once.`;
  case 'persist':return `Unfinished ${many(e.event)} carry into the next wave.`;
 }
}

/** Events an offer pays more for, but cannot create by itself. */
function payoffOnly(offer:string):EventKind|null{
 const m=mechanicsFor(offer);
 if(!m)return null;
 const adds=m.effects.filter(e=>e.kind==='payoutAdd'||e.kind==='payoutMult');
 const spawns=m.effects.some(e=>['startEvents','onComplete','withEvents','replaceElites','hellfireSpawns','groupAdd','convert'].includes(e.kind));
 return adds.length&&!spawns?(adds[0] as {event:EventKind}).event:null;
}

/** What a faster-spawning offer would be worth without Impending Doom, when Doom costs it at least 5 Aether. */
function withoutDoom(offer:string,s:Scenario,d:Draws,samples:number):number|null{
 if(!s.profile.warPlanNodes.includes('Impending Doom')||!mechanicsFor(offer)?.effects.some(e=>e.kind==='eventRate'))return null;
 const mean=marginal({...s,profile:{...s.profile,warPlanNodes:s.profile.warPlanNodes.filter(x=>x!=='Impending Doom')}},offer,samples).mean;
 return mean-d.mean>=5?mean:null;
}

function explain(offer:string,s:Scenario,d:Draws,noDoom:number|null=null):string[]{
 const m=mechanicsFor(offer)!,remain=remainingWaves(s),reasons:string[]=[];
 if(remain===0)return ['No waves remain, so no offer changes your Aether.'];
 // Only name effects clearly larger than simulation noise (three standard errors).
 const real=([k,v]:[string,number])=>Math.abs(v)>=1&&Math.abs(v)>3*d.noise[k as EventKind];
 const gains=Object.entries(d.components).filter(e=>e[1]>0&&real(e)).sort((a,b)=>b[1]-a[1]);
 const losses=Object.entries(d.components).filter(e=>e[1]<0&&real(e)).sort((a,b)=>a[1]-b[1]);
 const puffing=s.history.some(x=>mechanicsFor(x)?.effects.some(e=>e.kind==='puffing'));
 const payoff=payoffOnly(offer);
 const converted=payoff?s.history.flatMap(x=>mechanicsFor(x)?.effects??[]).find(e=>e.kind==='convert'&&e.from===payoff):undefined;

 if(m.category==='Chaos'){
  reasons.push('Replaces the next wave with one random Chaos Wave. You cannot pick which; the model averages over the possible types.');
  if(s.profile.warPlanNodes.includes('Bedlam'))reasons.push('Includes your Bedlam bonus for entering a Chaos Wave.');
 }else if(payoff&&converted?.kind==='convert'&&Math.abs(d.mean)<1){
  reasons.push(`Your stack turns every ${one(payoff)} into ${a(converted.to)}, so this ${one(payoff)} bonus adds nothing.`);
 }else if(payoff&&Math.abs(d.mean)<1&&(d.components[payoff]??0)<1){
  reasons.push(`Nothing in your stack spawns ${many(payoff)} often enough yet, so this adds about nothing now.`);
 }else if(d.mean<=-1){
  reasons.push(`Costs about ${Math.round(-d.mean)} Aether overall across ${plural(remain,'wave')}${gains.length?`, despite gains from ${parts(gains)}`:''}.`);
 }else if(puffing&&m.category!=='Masses'&&d.components.Mass>=d.mean/2&&d.components.Mass>=1){
  reasons.push(`Most of this value is extra Mass Aether (+${Math.round(d.components.Mass)}), boosted by your Puffing Masses.`);
 }else if(gains.length){
  reasons.push(`Mostly from ${parts(gains)} over ${plural(remain,'wave')}.`);
 }
 if(losses.length){
  const kinds=new Set(m.effects.map(e=>e.kind));
  reasons.push(m.category==='Chaos'?`Replacing the normal wave gives up its Aether from ${parts(losses)}.`:
   kinds.has('convert')?`Converted events no longer pay as before: ${parts(losses)}.`:
   // Faster spawning adds no event time, so a category drops only when better events replace it.
   kinds.size===1&&kinds.has('eventRate')?`With more events to choose from, you skip some for better-paying ones, so you get less from ${parts(losses)}.`:
   // Offers that add or slow events lose Aether elsewhere by running out of time.
   ['timeMult','timeAdd','startEvents','onComplete','withEvents','replaceElites','hellfireSpawns','groupAdd','weightAdd','eliteRate'].some(k=>kinds.has(k as Effect['kind']))?`Time spent on its events costs you Aether from ${parts(losses)}.`:
   kinds.has('weightMult')?`It changes which events appear, so you get less from ${parts(losses)}.`:
   `It lowers Aether from ${parts(losses)}.`);
 }
 if(noDoom!==null){
  const late=(s.profile.terrorRank??0)>=WAR_PLAN_EFFECTS.doomSplinterRank.value?WAR_PLAN_EFFECTS.doomSplinterSeconds.value:WAR_PLAN_EFFECTS.doomSeconds.value;
  reasons.push(`Impending Doom spawns events on a timer in the last ${late} seconds of each wave, and faster spawning can't speed those up. Without Impending Doom this would be worth about +${Math.round(noDoom)}.`);
 }
 const effects=m.effects.map(describe).filter((x):x is string=>x!==null);
 if(effects.length)reasons.push(effects.join(' '));
 return reasons;
}

function provenanceNotes(offer:string):string[]{
 const m=mechanicsFor(offer)!,notes:string[]=[];
 if(m.category==='Chaos')notes.push('Chaos Wave types follow Maxroll; their odds and payouts are placeholders, not measurements.');
 const params=m.effects.flatMap(e=>Object.values(e).filter((v):v is Param=>typeof v==='object'&&v!==null&&'provenance' in v));
 const label={implied:'Implied by the game text',observed:'Observed in game',guide:'From guides',disputed:'Disputed',assumed:'Assumed'} as const;
 const flagged=params.filter((p):p is Param&{provenance:keyof typeof label}=>p.provenance!=='game');
 notes.push(...flagged.map(p=>`${label[p.provenance]}: ${p.note??p.value}.`));
 if(params.some(p=>p.provenance==='game'))notes.push('Other values come from the game\'s own offer text.');
 return notes;
}
const GLOBAL_ASSUMPTIONS=[
 `Event spawn rate, event mix, travel and kill times are assumptions (for example ${BASE.fillSeconds.value} s of demon-killing per Aether Event), not measurements.`,
 'Gains compare each offer with an offer that has no effect. Later picks count toward your stack size but nothing else.',
 'Ranges show spread across simulated runs, not calibrated confidence intervals.'
];

/** A pick the catalog doesn't model: it counts toward stack size and nothing else. */
const NO_EFFECT='(an offer with no effect)';

function synergiesFor(offer:string,s:Scenario):Synergy[]{
 const m=mechanicsFor(offer),remain=remainingWaves(s)-1;
 if(!m?.complements||remain<1)return [];
 const out:Synergy[]=[];
 for(const k of m.complements){
  if(k===offer||s.history.includes(k)||!mechanicsFor(k))continue;
  // Both arms take a pick now, so stack-size effects such as Puffing cancel.
  const withThis=marginal(s,k,120,BASELINE,[...s.history,offer],remain).mean;
  const without=marginal(s,k,120,BASELINE,[...s.history,NO_EFFECT],remain).mean;
  if(withThis-without>=5)out.push({offer:k,withThis,without});
 }
 return out.sort((a,b)=>(b.withThis-b.without)-(a.withThis-a.without)).slice(0,2);
}

function pactAdvice(special:string,modeled:Estimate[],unknown:Unsupported[],s:Scenario):PactAdvice{
 const pact=modeled.find(x=>x.offer===special),remaining=remainingWaves(s);
 const regular=modeled.filter(x=>x.offer!==special).sort((a,b)=>b.mean-a.mean)[0]??null;
 if(!pact||unknown.some(x=>x.offer!==special)||!regular)return {offer:special,premium:null,bestRegular:regular?.offer??null,remaining,
  advice:!pact?'The Pact offer is not modeled, so HordeMind cannot say whether to use the Pact on it.':
   unknown.some(x=>x.offer!==special)?'Some regular offers are not modeled, so HordeMind cannot price using the Pact here.':
   'There is no regular offer to compare the Pact offer with.'};
 const premium=pact.mean-regular.mean;
 const advice=remaining===0?'No waves remain.':remaining===1?'This is the last wave, so the Pact has no later use. Take its offer if it is your best option.':
  premium<=0?`${regular.offer} is worth at least as much here, so keep the Pact for a later wave.`:
  `Using the Pact here gains about +${Math.round(premium)} over your best regular offer (${regular.offer}). Save it only if you expect a later Pact offer to beat that wave's best regular offer by more, with fewer waves left to pay off. A Pact offer always synergizes with your most recent pick, so its later value depends on what you take next.`;
 return {offer:special,premium,bestRegular:regular.offer,remaining,advice};
}

export function compareScenario(input:Scenario,candidates:string[],samples=400,options:CompareOptions={}):Comparison{
 const s={...input,decisionWave:Math.min(Math.max(1,input.decisionWave),input.totalWaves+1)};
 const n=Math.max(60,Math.min(1600,Math.round(samples)));
 const unique=[...new Set(candidates.map(x=>x.trim()).filter(Boolean))];
 const modeled:Estimate[]=[],unknown:Unsupported[]=[];
 for(const offer of unique){
  if(!hasMechanics(offer)){
   unknown.push({offer,modeled:false,reason:'The simulator does not represent this offer yet. That is not an estimate of +0 Aether.'});
   continue;
  }
  const d=marginal(s,offer,n);
  modeled.push({offer,modeled:true,...d,reasons:explain(offer,s,d,withoutDoom(offer,s,d,n)),assumptions:provenanceNotes(offer),sensitivity:[],
   synergies:options.synergy===false?[]:synergiesFor(offer,s)});
 }
 modeled.sort((a,b)=>b.mean-a.mean);
 let robust:boolean|null=null;
 if(options.sensitivity!==false&&modeled.length>1&&remainingWaves(s)>0){
  const alt=Math.max(60,Math.round(n/2));
  for(const set of SENSITIVITY)for(const e of modeled)e.sensitivity.push({name:set.name,mean:marginal(s,e.offer,alt,set).mean});
  const best=modeled[0]!.offer;
  robust=SENSITIVITY.every((_,i)=>modeled.every(e=>e.offer===best||e.sensitivity[i]!.mean<=modeled[0]!.sensitivity[i]!.mean));
 }
 const special=options.specialOffer?.trim()||null;
 return {
  assessments:[...modeled,...unknown],recommended:modeled[0]?.offer??null,conditional:unknown.length>0,samples:n,modelVersion:RECOMMENDER_VERSION,
  robust,pact:special?pactAdvice(special,modeled,unknown,s):null,
  warnings:[
   ...(unknown.length?['Some offers are not modeled, so the best modeled offer may not be the best offer.']:[]),
   ...(robust===false?['The best offer changes under other plausible assumptions about event timing; treat this as a close call.']:[]),
   ...GLOBAL_ASSUMPTIONS
  ]
 };
}

/** Offers the simulator models, for coverage reporting. */
export const MODELED_OFFERS=MECHANICS.map(m=>m.id);
