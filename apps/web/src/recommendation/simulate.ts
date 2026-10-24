/**
 * Time-competitive wave simulator. Each wave is a fixed time budget: killing demons fills
 * the progress bar, which spawns Aether Events, and time spent completing events is time
 * not spent filling the bar. A Spire that pays well but takes ten seconds therefore
 * displaces other events, which is the opportunity cost a fixed-count model misses.
 * When several events wait, the player takes the one that pays the most per second.
 *
 * This is a surrogate with explicit assumptions (see mechanics.ts), not Blizzard's scheduler.
 */
import {BASE,CHAOS_OUTCOMES,EVENT_KINDS,WAR_PLAN_EFFECTS,mechanicsFor,type EventKind,type OfferMechanics} from './mechanics';

export type Breakdown=Record<EventKind,number>;
export const emptyBreakdown=():Breakdown=>Object.fromEntries(EVENT_KINDS.map(k=>[k,0])) as Breakdown;

export interface PlayerProfile{killSpeed:'fast'|'average'|'slow'|'unknown';mobility:'high'|'average'|'low'|'unknown';warPlanNodes:readonly string[];splinterRank?:number|null}

/** Scales for sensitivity analysis; 1 everywhere is the baseline. */
export interface Assumptions{completionScale:number;fillScale:number}
export const BASELINE:Assumptions={completionScale:1,fillScale:1};

export interface WaveSpec{
 /** Waves since the decision; 0 is the wave the offer precedes. */
 index:number;
 /** Offers active this wave, in pick order. Unknown names are carried for stack size only. */
 stack:readonly string[];
 /** Picks after the decision that HordeMind cannot know; each counts as one offer with no effect. */
 genericPicks:number;
 chaos:boolean;
 /** Stack position of the pick made at this decision; first-wave-only effects of older picks have already fired. */
 newPickIndex:number|null;
}

/** Aggregated effects of a stack; computed once per wave. */
interface Rules{
 start:Map<EventKind,number>;
 onComplete:Map<EventKind,{spawn:EventKind|'AetherEvent';chance:number}[]>;
 weightAdd:Map<EventKind,number>;
 timeAdd:Map<EventKind,number>;
 once:Map<EventKind,number>;
 persist:Set<EventKind>;
 eliteRate:number;
 withEvents:Map<EventKind,number>;
 replaceElites:Map<EventKind,number>;
 payoutAdd:Map<EventKind,number>;
 payoutMult:Map<EventKind,number>;
 weightMult:Map<EventKind,number>;
 timeMult:Map<EventKind,number>;
 eventRate:number;
 convertFiendFactor:number|null;
 groupAdd:number;
 waveEnd:{min:number;max:number}[];
 hellfireSources:number;
 hellfireSpawnsPerSource:number;
 puffing:number;
 stackSize:number;
 massOffers:number;
}
const bump=(m:Map<EventKind,number>,k:EventKind,v:number)=>m.set(k,(m.get(k)??0)+v);
const scale=(m:Map<EventKind,number>,k:EventKind,v:number)=>m.set(k,(m.get(k)??1)*v);

export function rulesFor(spec:WaveSpec):Rules{
 const r:Rules={start:new Map(),onComplete:new Map(),weightAdd:new Map(),timeAdd:new Map(),once:new Map(),persist:new Set(),eliteRate:1,withEvents:new Map(),replaceElites:new Map(),payoutAdd:new Map(),payoutMult:new Map(),weightMult:new Map(),timeMult:new Map(),
  eventRate:0,convertFiendFactor:null,groupAdd:0,waveEnd:[],hellfireSources:0,hellfireSpawnsPerSource:0,puffing:0,
  stackSize:spec.stack.length+spec.genericPicks,massOffers:0};
 const picks=spec.stack.map((name,position)=>({m:mechanicsFor(name),position})).filter((x):x is {m:OfferMechanics;position:number}=>x.m!==null);
 // An offer another active offer replaces (Burning Rain under Wrath of Hell) contributes nothing.
 const replaced=new Set(picks.flatMap(({m})=>m.effects.flatMap(e=>e.kind==='waveEnd'&&e.replaces?[e.replaces]:[])));
 const misses=new Map<EventKind,number>(),eliteMisses=new Map<EventKind,number>();
 for(const {m,position} of picks){
  if(m.category==='Masses')r.massOffers++;
  if(replaced.has(m.id))continue;
  for(const e of m.effects){
   switch(e.kind){
    case 'startEvents':if(!e.firstWaveOnly||spec.index===0&&position===spec.newPickIndex)bump(r.start,e.event,e.count.value);break;
    case 'onComplete':{const list=r.onComplete.get(e.from)??[];list.push({spawn:e.spawn,chance:e.chance.value});r.onComplete.set(e.from,list);break}
    // Independent chances combine as 1 − Π(1 − p).
    case 'withEvents':scale(misses,e.spawn,1-e.chance.value);break;
    case 'replaceElites':scale(eliteMisses,e.spawn,1-e.chance.value);break;
    case 'payoutAdd':bump(r.payoutAdd,e.event,e.amount.value);break;
    case 'payoutMult':scale(r.payoutMult,e.event,e.factor.value);break;
    case 'weightMult':scale(r.weightMult,e.event,e.factor.value);break;
    case 'timeMult':scale(r.timeMult,e.event,e.factor.value);break;
    case 'eventRate':r.eventRate+=e.add.value;break;
    case 'convert':r.convertFiendFactor=Math.max(r.convertFiendFactor??0,e.payoutFactor.value);break;
    case 'groupAdd':r.groupAdd+=e.count.value;break;
    case 'waveEnd':r.waveEnd.push({min:e.min.value,max:e.max.value});break;
    case 'hellfireSource':r.hellfireSources+=e.amount.value;break;
    case 'hellfireSpawns':r.hellfireSpawnsPerSource+=e.perSource.value;break;
    case 'puffing':r.puffing++;break;
    case 'weightAdd':bump(r.weightAdd,e.event,e.weight.value);break;
    case 'eliteRate':r.eliteRate*=e.factor.value;break;
    case 'timeAdd':bump(r.timeAdd,e.event,e.seconds.value);break;
    case 'once':if(spec.index===0&&position===spec.newPickIndex)bump(r.once,e.event,e.amount.value);break;
    case 'persist':r.persist.add(e.event);break;
    case 'chaos':break;
   }
  }
 }
 for(const [k,miss] of misses)r.withEvents.set(k,1-miss);
 for(const [k,miss] of eliteMisses)r.replaceElites.set(k,1-miss);
 return r;
}

export function random(seed:number){
 let s=seed|0;
 return ()=>{s=(s+0x6D2B79F5)|0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}
export const hash=(s:number)=>{let x=s|0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);return (x^(x>>>16))>>>0};

interface Pending{kind:EventKind;/** Spawned where the player already is, e.g. a reformed Mass. */local:boolean;lord?:boolean}

/**
 * Index of the waiting event that pays the most Aether per second and still finishes in
 * `timeLeft`. Ties keep spawn order. Returns 0 when none fits, so the oldest is dropped.
 */
export function pickNext<E>(queue:readonly E[],timeLeft:number,cost:(e:E)=>number,value:(e:E)=>number):number{
 let best=0,score=-Infinity;
 queue.forEach((e,i)=>{const c=cost(e);if(c<=timeLeft&&value(e)/c>score){score=value(e)/c;best=i}});
 return best;
}

/**
 * Simulates one wave. Each random purpose has its own stream, so draws for one purpose
 * stay aligned across paired comparisons even when one stack makes more draws of another.
 */
export function simulateWave(spec:WaveSpec,profile:PlayerProfile,seed:number,assumptions:Assumptions=BASELINE):Breakdown{
 return simulateWaveDetailed(spec,profile,seed,assumptions).out;
}

/** One wave, plus unfinished events that persist into the next (The Enduring Lords). */
export function simulateWaveDetailed(spec:WaveSpec,profile:PlayerProfile,seed:number,assumptions:Assumptions=BASELINE,carried:readonly EventKind[]=[]):{out:Breakdown;leftover:EventKind[]}{
 const out=emptyBreakdown(),leftover:EventKind[]=[];
 const streams={types:random(hash(seed^0x51)),rolls:random(hash(seed^0xa3)),extras:random(hash(seed^0xc7)),chaos:random(hash(seed^0xe9)),
  hellfire:random(hash(seed^0x2f)),waveEnd:random(hash(seed^0x7d)),elites:random(hash(seed^0x3b))};
 const speed=BASE.clearTime[profile.killSpeed==='unknown'?'average':profile.killSpeed].value;
 if(spec.chaos){
  const total=CHAOS_OUTCOMES.reduce((a,o)=>a+o.weight.value,0);
  let x=streams.chaos()*total,outcome=CHAOS_OUTCOMES[0]!;
  for(const o of CHAOS_OUTCOMES){x-=o.weight.value;if(x<=0){outcome=o;break}}
  // Faster builds clear more of a Chaos Wave; assumed square-root scaling.
  out.Chaos+=(outcome.low+(outcome.high-outcome.low)*streams.chaos())/Math.sqrt(speed);
  if(profile.warPlanNodes.includes('Bedlam'))out.Chaos+=WAR_PLAN_EFFECTS.Bedlam.value;
  // A Chaos Wave replaces the wave; Lords carried in by Enduring Lords are still waiting.
  return {out,leftover:[...carried]};
 }
 const r=rulesFor(spec);
 const travel=BASE.travel[profile.mobility==='unknown'?'average':profile.mobility].value;
 const fill=BASE.fillSeconds.value*assumptions.fillScale*speed/(1+r.eventRate);
 const weights=(['Mass','Fiend','Spire','Lord'] as const).map(k=>[k,(BASE.eventWeights[k].value+(r.weightAdd.get(k)??0))*(r.weightMult.get(k)??1)] as const);
 const weightTotal=weights.reduce((a,[,w])=>a+w,0);
 const group=BASE.hellborneGroup.value+r.groupAdd;

 const worth=(kind:EventKind,lord=false)=>{
  let base=kind==='Lord'&&lord&&r.convertFiendFactor?BASE.aether.Lord.value*r.convertFiendFactor:kind==='Hellborne'?0:kind in BASE.aether?BASE.aether[kind as keyof typeof BASE.aether].value:0;
  if(kind==='Hellborne')base=group*(BASE.aether.Hellborne.value+(r.payoutAdd.get('Hellborne')??0));
  else base+=r.payoutAdd.get(kind)??0;
  if(kind==='Mass'&&r.puffing)base+=r.puffing*(r.stackSize+r.massOffers);
  return base*(r.payoutMult.get(kind)??1);
 };
 const pay=(kind:EventKind,lord=false)=>{out[kind]+=worth(kind,lord)};
 const cost=(e:Pending)=>{
  const completion=BASE.completion[e.kind as keyof typeof BASE.completion]?.value??3;
  const groupScale=e.kind==='Hellborne'?group/BASE.hellborneGroup.value:1;
  return (e.local?0:travel)+completion*groupScale*speed*assumptions.completionScale*(r.timeMult.get(e.kind)??1)+(r.timeAdd.get(e.kind)??0);
 };
 // Every Fiend, whatever spawned it, arrives as a Lord under Colossal Fiends.
 const event=(kind:EventKind,local:boolean):Pending=>kind==='Fiend'&&r.convertFiendFactor?{kind:'Lord',local,lord:true}:{kind,local};

 // The player values an event by its Aether plus the expected Aether of what it spawns on death.
 const worthOf=(e:Pending)=>worth(e.kind,e.lord);
 const meanEvent=weightTotal>0?weights.reduce((a,[k,w])=>a+w*worthOf(event(k,false)),0)/weightTotal:0;
 const value=(e:Pending)=>worthOf(e)+(r.onComplete.get(e.kind)??[]).reduce((a,{spawn,chance})=>a+chance*(spawn==='AetherEvent'?meanEvent:worthOf(event(spawn,true))),0);
 const spawnFromProgress=(queue:Pending[])=>{
  let x=streams.types()*weightTotal,kind:EventKind='Mass';
  for(const [k,w] of weights){x-=w;if(x<=0){kind=k;break}}
  queue.push(event(kind,false));
  for(const [extra,chance] of r.withEvents)if(streams.extras()<chance)queue.push(event(extra,false));
 };

 // Impending Doom: Aether Events at every location late in the wave (and earlier at Splinter rank 14).
 const T=BASE.waveSeconds.value;
 const doomAt=profile.warPlanNodes.includes('Impending Doom')?[
  ...((profile.splinterRank??0)>=WAR_PLAN_EFFECTS.doomSplinterRank.value?[T-WAR_PLAN_EFFECTS.doomSplinterSeconds.value]:[]),
  T-WAR_PLAN_EFFECTS.doomSeconds.value]:[];
 // Elites killed while filling the bar may arrive as another enemy; a converted Lord still takes time.
 const killElites=(queue:Pending[])=>{
  for(const [spawn,chance] of r.replaceElites){
   if(streams.elites()>=BASE.elitesPerFill.value*r.eliteRate*chance)continue;
   const e=event(spawn,true);
   if(e.kind===spawn)pay(spawn);else queue.unshift(e);
  }
 };
 const fireDoom=(queue:Pending[])=>{for(let i=0;i<BASE.eventLocations.value;i++)spawnFromProgress(queue)};

 const queue:Pending[]=[];
 for(const kind of carried)queue.push(event(kind,false));
 for(const [kind,n] of r.start)for(let i=0;i<Math.round(n);i++)queue.push(event(kind,false));
 for(const [kind,amount] of r.once)out[kind]+=amount;
 const hellfireGroups=r.hellfireSpawnsPerSource*(BASE.ambientHellfire.value+r.hellfireSources);
 const hellfireCount=Math.floor(hellfireGroups)+(streams.hellfire()<hellfireGroups%1?1:0);
 for(let i=0;i<hellfireCount;i++)queue.push(event('Hellborne',false));

 let time=0,progress=0,guard=0;
 while(time<T&&guard++<400){
  while(doomAt.length&&time>=doomAt[0]!){doomAt.shift();fireDoom(queue)}
  const next=queue.splice(pickNext(queue,T-time,cost,value),1)[0];
  if(!next){
   const need=(1-progress)*fill,doom=doomAt[0];
   // Stop filling at a timed trigger so it fires on time.
   if(doom!==undefined&&time+need>doom){progress+=(doom-time)/fill;time=doom;continue}
   time+=need;progress=0;
   if(time<T){killElites(queue);spawnFromProgress(queue)}
   continue;
  }
  const c=cost(next);
  if(time+c>T){if(r.persist.has(next.kind))leftover.push(next.kind);continue}
  time+=c;
  pay(next.kind,next.lord);
  progress+=c*BASE.progressWhileBusy.value/fill;
  while(progress>=1){progress-=1;spawnFromProgress(queue)}
  // Follow-ups spawn where the event died, so they cost no travel.
  for(const {spawn,chance} of r.onComplete.get(next.kind)??[]){
   if(streams.rolls()>=chance)continue;
   if(spawn==='AetherEvent')spawnFromProgress(queue);else queue.unshift(event(spawn,true));
  }
 }
 for(const e of queue)if(r.persist.has(e.kind))leftover.push(e.kind);
 for(const {min,max} of r.waveEnd)out.Hellfire+=min+(max-min)*streams.waveEnd();
 return {out,leftover};
}

/** Aether over the remaining waves; the decision's offer applies from the first. */
export function simulateRun(history:readonly string[],extra:string|null,remaining:number,profile:PlayerProfile,seed:number,assumptions:Assumptions=BASELINE):Breakdown{
 const total=emptyBreakdown();
 const chaosNow=extra!==null&&mechanicsFor(extra)?.category==='Chaos';
 let carry:EventKind[]=[];
 for(let w=0;w<remaining;w++){
  // Every wave's pick is either the candidate or an offer with no effect, so stacks stay the same size.
  const stack=[...history,...(extra!==null?[extra]:[])];
  const {out:wave,leftover}=simulateWaveDetailed({index:w,stack,newPickIndex:extra!==null?history.length:null,genericPicks:w+(extra===null?1:0),chaos:chaosNow&&w===0},profile,hash(seed+Math.imul(w+1,0x9e3779b1)),assumptions,carry);
  carry=leftover;
  for(const k of EVENT_KINDS)total[k]+=wave[k];
 }
 return total;
}
