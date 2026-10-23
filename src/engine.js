import {byName,CHAOS_OUTCOMES,defaults} from "./catalog.js";
export const BASE={waves:10,wave:1,history:[],choices:["","","",""],kill:"fast",mobility:"high",specialAvailable:true,specialEnabled:true,warNodes:[],warPlanNotes:"",observations:[],assumptions:{...defaults}};
const namesOf=xs=>(xs||[]).map(x=>typeof x==="string"?x:x.name);
const count=(xs,effect)=>xs.reduce((s,name)=>s+(byName[name]?.effect===effect?1:0),0);
export function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function poisson(lambda,r){let n=0,limit=Math.exp(-Math.min(lambda,20)),p=1;while(p>limit&&n<100){n++;p*=r()}return Math.max(0,n-1)}
function binomial(n,p,r){let x=0;for(let i=0;i<Math.min(200,Math.round(n));i++)if(r()<p)x++;return x}
function chaosSample(r,a){let total=CHAOS_OUTCOMES.reduce((s,o)=>s+o.weight,0),x=r()*total,result=CHAOS_OUTCOMES.at(-1);for(const o of CHAOS_OUTCOMES){x-=o.weight;if(x<=0){result=o;break}}return {name:result.name,value:(result.payout[0]+r()*(result.payout[1]-result.payout[0]))*a.chaosScale}}
// Paired, seeded wave simulations. futureChoices[i] is selected after wave i, for wave i+1.
// Model parameters are explicitly assumptions; it does not reproduce the game's hidden spawn scheduler.
export function simulate(state,chosen,seed,futureChoices=[]){
 const a={...defaults,...(state.assumptions||{})},initial=namesOf(state.history);
 const remaining=Math.max(1,Number(state.waves)-Number(state.wave)+1);
 const speed=(state.kill==="slow"?.55:state.kill==="medium"?.85:1)*(state.mobility==="low"?.82:1);
 const breakdown={Mass:0,Fiend:0,Lord:0,Spire:0,Hellborne:0,Chaos:0,Other:0};
 const events=Object.fromEntries(Object.keys(breakdown).map(k=>[k,0])),perWave=[];
 let total=0;
 for(let w=0;w<remaining;w++){
  const r=random((seed^(Math.imul(w+1,0x9e3779b1)))>>>0);
  const active=[...initial,...(chosen?[chosen]:[]),...futureChoices.slice(0,w).filter(Boolean)];
  const n=e=>count(active,e),massOffers=active.filter(x=>byName[x]?.kind==="mass").length;
  const wavePicked=w===0?chosen:futureChoices[w-1];
  const start=total;
  const pay=(kind,value)=>{breakdown[kind]+=value;total+=value;events[kind]++};
  // Chaos is a replacement of this wave, not free Aether in an otherwise normal wave.
  if(wavePicked==="Chaotic Offering"){
   const outcome=chaosSample(r,a);
   pay("Chaos",outcome.value*speed+((state.warNodes||[]).includes("Bedlam")?50:0));
   perWave.push({wave:Number(state.wave)+w,aether:total-start,chaos:outcome.name});
   continue;
  }
  let time=60*speed;
  const eventRateScale=1+.35*n("hordes");
  const massBase=poisson(a.massRate*eventRateScale,r);
  let masses=massBase+2*n("burst"),fiends=poisson(a.fiendRate*eventRateScale,r),
      spires=poisson(a.spireRate*eventRateScale,r)+n("rising");
  let lords=n("summonedLord")?poisson(a.lordRate*Math.max(1,n("summonedLord")),r):0;
  const eventsGenerated=massBase+fiends+spires+lords;
  let hells=n("summonHell")?binomial(eventsGenerated,1-Math.pow(.8,n("summonHell")),r):0;
  hells+=n("ambushHell")?binomial(eventsGenerated,Math.min(.6,.12*n("ambushHell")),r):0;
  hells+=n("burnHell")||n("meteorHell")?binomial(2,.6,r):0;
  if(n("surgeHell"))hells*=1+n("surgeHell");
  const payoutMass=3+n("puff")*(active.length+massOffers)+n("exaltedMass");
  const payoutFiend=4+2*n("exaltedFiend");
  const payoutLord=6+8*n("colossal")+5*n("ruthless")+3*n("summonedLord");
  const payoutHell=4+n("exaltHell")+n("ambushHell")+n("summonHell")+2*n("burnHell");
  const payoutSpire=5+6*n("precious")+5*n("treasured")+4*n("coveted")+3*n("draining");
  const kill=cost=>{if(time<cost)return false;time-=cost;return true};
  let massKills=0;
  while(masses>0&&massKills<150&&kill(a.secondsPerMass*(1+.3*n("reform")))){
   massKills++;masses--;pay("Mass",payoutMass);
   if(n("reform")&&r()<1-Math.pow(.7,n("reform")))masses++;
   if(n("teem")&&r()<1-Math.pow(.5,n("teem")))fiends++;
   if(n("hellish")&&r()<1-Math.pow(.5,n("hellish")))hells++;
   if(n("anchor")&&r()<1-Math.pow(.5,n("anchor")))spires++;
  }
  let loops=0;
  while(fiends>0&&loops++<150&&kill(a.secondsPerElite*(1+.25*n("exaltedFiend")))){
   fiends--;pay("Fiend",payoutFiend);
   if(n("legions")&&r()<1-Math.pow(.6,n("legions")))lords++;
  }
  loops=0;
  while(hells>0&&loops++<150&&kill(a.secondsPerElite)){hells--;pay("Hellborne",payoutHell)}
  loops=0;
  while(lords>0&&loops++<100&&kill(a.secondsPerLord*(1+.2*n("enduring")))){lords--;pay("Lord",payoutLord)}
  loops=0;
  while(spires>0&&loops++<150&&kill(a.secondsPerSpire*(n("hungry")?1.12:1))){spires--;pay("Spire",payoutSpire)}
  if(n("goblins")&&time>=3&&r()<.55){pay("Other",20*n("goblins"));time-=3}
  if(n("rain"))pay("Other",n("rain")*(9+r()*6));
  if(n("wrath"))pay("Other",n("wrath")*(15+r()*9));
  if(n("stalking")&&w===0)pay("Other",100*n("stalking"));
  perWave.push({wave:Number(state.wave)+w,aether:total-start,chaos:null});
 }
 return {total,breakdown,events,perWave};
}
export function evaluate(state,name,samples=1200){
 const n=Math.max(100,Math.min(5000,Math.round(samples))),gains=[],parts={},eventDelta={};
 for(let i=0;i<n;i++){
  const seed=(20261023+i*31991)>>>0;
  const before=simulate(state,null,seed),after=simulate(state,name,seed);
  gains.push(after.total-before.total);
  for(const k of Object.keys(after.breakdown)){
   parts[k]=(parts[k]||0)+(after.breakdown[k]-before.breakdown[k])/n;
   eventDelta[k]=(eventDelta[k]||0)+(after.events[k]-before.events[k])/n;
  }
 }
 gains.sort((a,b)=>a-b);
 return {name,mean:gains.reduce((a,b)=>a+b,0)/n,lo:gains[Math.floor(n*.05)],hi:gains[Math.floor(n*.95)],parts,events:eventDelta};
}
export function diagnose(state,result){
 const o=byName[result.name],active=namesOf(state.history);
 const has=e=>active.some(name=>byName[name]?.effect===e);
 const comments=[];
 if(o?.effect==="exaltHell"){
  const spawners=["summonHell","ambushHell","burnHell","meteorHell","hellish"];
  comments.push(spawners.some(has)?"Adds +1 Aether per Hellborne. Your selected offers include a Hellborne spawn source.":"No Hellborne spawner recorded. Exalted increases payout but does not spawn Hellborne, so immediate value can be zero; acquiring a spawner later could change this.");
 }
 if(o?.effect==="anchor")comments.push("Masses can generate Soulspires, but Spires consume event-clear time and can displace more rewarding Mass kills.");
 if(o?.effect==="burst")comments.push("Adds two Masses at the start of every remaining wave, benefiting from Puffing, reform, and on-death spawn modifiers.");
 if(o?.effect==="chaos")comments.push("The next normal wave is replaced by one random Chaos Wave. Outcome probabilities and Aether payout ranges are modeled assumptions.");
 if(!comments.length)comments.push(o?.detail||"Unknown offer effect.");
 return comments;
}
export function specialDecision(state,result){
 if(!state.specialEnabled||!state.specialAvailable)return null;
 const remaining=Math.max(0,Number(state.waves)-Number(state.wave));
 return {remaining,knownNow:result?.mean??null,status:remaining>0?"Uncalibrated future option cost":"No later opportunities",explanation:remaining>0?"The Black Pact's one-time selection can be kept for a later wave. The lookahead tool estimates the cost of spending it now under an explicitly hypothetical future-offer distribution.":"No future waves remain, so saving the one-time selection cannot help this run."};
}
