import {byName,CHAOS_OUTCOMES,defaults} from "./catalog.js";
export const BASE={waves:10,wave:1,history:[],choices:["","","",""],kill:"fast",mobility:"high",specialAvailable:true,specialEnabled:true,warNodes:[],warPlanNotes:"",observations:[],assumptions:{...defaults}};
const count=(xs,k)=>xs.filter(x=>byName[x]?.effect===k).length;
export function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function trial(n,p,r){let hits=0;for(let i=0;i<Math.min(150,n);i++)if(r()<p)hits++;return hits}
function chaosSample(r,a){let sum=CHAOS_OUTCOMES.reduce((t,o)=>t+o.weight,0),x=r()*sum;let outcome=CHAOS_OUTCOMES.at(-1);for(const o of CHAOS_OUTCOMES){x-=o.weight;if(x<=0){outcome=o;break}}return {name:outcome.name,value:(outcome.payout[0]+r()*(outcome.payout[1]-outcome.payout[0]))*a.chaosScale}}
export function simulate(state,chosen,seed) {
 const r=random(seed),a={...defaults,...state.assumptions};
 const active=[...(state.history||[]).map(x=>typeof x==="string"?x:x.name),...(chosen?[chosen]:[])];
 const n=k=>count(active,k),massCount=active.filter(x=>byName[x]?.kind==="mass").length;
 const remaining=Math.max(1,Number(state.waves)-Number(state.wave)+1);
 const speed=(state.kill==="slow"?.55:state.kill==="medium"?.85:1)*(state.mobility==="low"?.82:1);
 const payoutMass=3+n("puff")*(active.length+massCount)+n("exaltedMass");
 const payoutFiend=4+n("exaltedFiend")*2;
 const payoutLord=6+n("colossal")*8+n("ruthless")*5;
 const payoutHell=4+n("exaltHell")+n("ambushHell")+n("summonHell")+2*n("burnHell");
 const payoutSpire=5+n("precious")*6+n("treasured")*5+n("coveted")*4;
 const breakdown={Mass:0,Fiend:0,Lord:0,Spire:0,Hellborne:0,Chaos:0,Other:0},events={Mass:0,Fiend:0,Lord:0,Spire:0,Hellborne:0,Chaos:0};
 let total=0; const pay=(k,v)=>{breakdown[k]+=v;total+=v;events[k]=(events[k]||0)+1};
 for(let w=0;w<remaining;w++) {
  // Chaos changes the upcoming wave; do NOT stack an intact normal wave on top.
  if(chosen==="Chaotic Offering"&&w===0){const co=chaosSample(r,a);pay("Chaos",co.value*speed);continue}
  let time=60*speed,remainingEvents=Math.max(1,Math.round((a.massRate+a.fiendRate+a.spireRate+a.lordRate)*(1+n("hordes")*.5)));
  let masses=2*n("burst")+Math.max(0,Math.floor(remainingEvents*.42+r()*2));
  let fiends=Math.max(0,Math.floor(remainingEvents*.3+r()*2));
  let spires=Math.max(0,Math.floor(remainingEvents*.16+r()*2))+n("rising");
  let lords=n("summonedLord")?1+Math.floor(r()*2):0;
  // Hellborne do not normally spawn unless an appropriate spawning offer is active.
  let hells=n("summonHell")?trial(remainingEvents,1-Math.pow(.8,n("summonHell")),r):0;
  hells+=n("ambushHell")?trial(remainingEvents,.12,r):0;
  hells+=(n("burnHell")||n("meteorHell"))?trial(2,.6,r):0;
  hells+=n("surgeHell")*hells;
  const kill=(cost)=>{if(time<cost)return false;time-=cost;return true};
  let massKills=0;
  while(masses>0&&massKills<100&&kill(a.secondsPerMass)) {
   masses--;massKills++;pay("Mass",payoutMass);
   if(n("reform")&&r()<1-Math.pow(.7,n("reform")))masses++;
   if(n("teem")&&r()<1-Math.pow(.5,n("teem"))){fiends++}
   if(n("hellish")&&r()<1-Math.pow(.5,n("hellish")))hells++;
   if(n("anchor")&&r()<.5)spires++;
  }
  while(fiends-->0&&kill(a.secondsPerElite)){pay("Fiend",payoutFiend);if(n("legions")&&r()<.4)lords++}
  while(hells-->0&&kill(a.secondsPerElite)){pay("Hellborne",payoutHell)}
  while(lords-->0&&kill(a.secondsPerLord)){pay("Lord",payoutLord)}
  while(spires-->0&&kill(a.secondsPerSpire)){pay("Spire",payoutSpire)}
  if(n("goblins")&&time>3&&r()<.55){pay("Other",12);time-=3}
  if(n("rain"))pay("Other",n("rain")*(9+r()*6));
  if(n("wrath"))pay("Other",15+r()*9);
  if(n("stalking")&&w===0)pay("Other",Math.min(1,n("stalking"))*100);

 }
 return {total,breakdown,events};
}
export function evaluate(state,name,samples=1200) {
 const gains=[],components={},eventDelta={}; const num=Math.max(100,Math.min(5000,samples));
 for(let i=0;i<num;i++) {
  const seed=(20261023+i*31991)>>>0;
  const baseline=simulate(state,null,seed);
  const candidate=simulate(state,name,seed);
  gains.push(candidate.total-baseline.total);
  for(const k in candidate.breakdown){components[k]=(components[k]||0)+(candidate.breakdown[k]-baseline.breakdown[k])/num;eventDelta[k]=(eventDelta[k]||0)+(candidate.events[k]-baseline.events[k])/num}
 }
 gains.sort((a,b)=>a-b);
 return {name,mean:gains.reduce((a,b)=>a+b,0)/num,lo:gains[Math.floor(num*.05)],hi:gains[Math.floor(num*.95)],parts:components,events:eventDelta};
}
export function diagnose(state,result) {
 const o=byName[result.name],active=(state.history||[]).map(x=>typeof x==="string"?x:x.name);
 const countEffect=(e)=>active.filter(n=>byName[n]?.effect===e).length;
 const comments=[];
 if(o?.effect==="exaltHell"){
  const spawners=["summonHell","ambushHell","burnHell","meteorHell","hellish"];
  if(!spawners.some(countEffect))comments.push("No Hellborne spawner recorded. Exalted Hellborne raises Hellborne reward but does not spawn them. Its immediate modeled value can genuinely be zero; acquiring a spawner later could change that.");
  else comments.push("Adds +1 Aether per Hellborne killed. Value depends on your existing Hellborne spawns and clear speed.");
 }
 if(o?.effect==="anchor")comments.push("Mass deaths can generate Soulspires, but completing Spires costs time and may displace other events.");
 if(o?.effect==="burst")comments.push("Adds starting Masses on every remaining wave; they inherit Puffing payouts and can trigger reform, Fiend or Hellborne effects.");
 if(o?.effect==="chaos")comments.push("The Chaos Wave is random and unknown when selected. Its payoff is sampled across possible outcomes; payout ranges and probabilities are provisional.");
 if(!comments.length)comments.push(o?.detail||"Unknown offer: mechanics are not calibrated.");
 return comments;
}
export function specialDecision(state,result) {
 if(!state.specialEnabled||!state.specialAvailable)return null;
 // Without verified probabilities for future middle-slot offerings, do NOT produce fictional EV.
 // We can give a conditional bound and indicate that saving preserves option value.
 const remaining=Math.max(0,Number(state.waves)-Number(state.wave));
 return {remaining,knownNow:result?.mean??null,status:remaining>0?"Unquantified future opportunity cost":"No subsequent waves to save for",explanation:remaining>0?"Using the one-time special selection now forfeits a potentially better later option. A numerical comparison requires War Plan-specific future offer frequencies, which are not yet measured.":"There is no later wave in this run; no future special opportunity remains."};
}
