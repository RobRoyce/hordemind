/**
 * Experimental, mechanics-aware model for the live decision loop.
 *
 * Distinguishes unsupported offers from genuine modeled zero marginal gain.
 * Assumptions are intentionally visible and should eventually be learned from
 * event-level observations. This is NOT a verified in-game spawn scheduler.
 */
import type {CharacterProfile} from '../domain/schema';

export const RECOMMENDER_VERSION = 's15-montecarlo-2.2-experimental';

type EventKind = 'Mass'|'Fiend'|'Hellborne'|'Lord'|'Spire'|'Chaos'|'Other';
type Reward = Record<EventKind,number>;
type Mechanics = 'burst'|'reform'|'puff'|'teem'|'hellish'|'anchor'|'exaltHell'|
 'summonHell'|'burnHell'|'meteorHell'|'surgeHell'|'ambushHell'|'exaltFiend'|
 'colossal'|'ruthless'|'legions'|'summonLord'|'precious'|'treasured'|'coveted'|
 'rising'|'goblins'|'hordes'|'stalking'|'chaos';
const emptyReward=():Reward=>({Mass:0,Fiend:0,Hellborne:0,Lord:0,Spire:0,Chaos:0,Other:0});
const MECHANICS:Record<string,Mechanics>={
 'The Bursting Masses':'burst','The Massing Masses':'reform','The Puffing Masses':'puff',
 'The Teeming Masses':'teem','The Hellish Masses':'hellish','The Anchored Masses':'anchor',
 'The Exalted Hellborne':'exaltHell','The Summoned Hellborne':'summonHell',
 'The Burning Hellborne':'burnHell','The Meteoric Hellborne':'meteorHell',
 'The Surging Hellborne':'surgeHell','The Ambushing Hellborne':'ambushHell',
 'The Exalted Fiends':'exaltFiend','The Colossal Fiends':'colossal',
 'The Ruthless Lords':'ruthless','The Fiendish Legions':'legions',
 'The Summoned Lords':'summonLord','The Precious Spires':'precious',
 'The Treasured Spires':'treasured','The Coveted Spires':'coveted',
 'The Rising Spires':'rising','The Aether Goblins':'goblins',
 'The Exalted Hordes':'hordes','The Stalking Devil':'stalking',
 'Chaotic Offering':'chaos'
};
const ALIASES:Record<string,string>={'The Chaotic Offering':'Chaotic Offering'};
const clean=(name:string)=>ALIASES[name]??name;
export function hasMechanics(name:string):boolean{return Object.hasOwn(MECHANICS,clean(name))}
export interface Estimate{
 offer:string; mean:number;low:number;high:number;components:Reward;
 reasons:string[];modeled:true; assumptions:string[];
}
export interface Unsupported{offer:string;modeled:false;reason:string}
export type OfferAssessment=Estimate|Unsupported;
export interface Comparison{assessments:OfferAssessment[]; recommended:string|null; conditional:boolean; samples:number;modelVersion:string;warnings:string[]}
/** `decisionWave` is the wave the offer precedes; the chosen offer applies from that wave on. */
export interface Scenario{
 history:string[];totalWaves:number;decisionWave:number;
 profile:Pick<CharacterProfile,'killSpeed'|'mobility'|'warPlanNodes'>;
}
export const remainingWaves=(s:Pick<Scenario,'totalWaves'|'decisionWave'>)=>Math.max(0,s.totalWaves-s.decisionWave+1);

const hash=(s:number)=>{let x=s|0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);return (x^(x>>>16))>>>0};
function random(seed:number){
 let s=seed|0;
 return ()=>{s=(s+0x6D2B79F5)|0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}
function poisson(mean:number,r:()=>number){let p=1,n=0,target=Math.exp(-mean);while(p>target&&n<80){p*=r();n++}return Math.max(0,n-1)}
function binomial(n:number,p:number,r:()=>number){let hits=0;for(let i=0;i<Math.min(150,n);i++)if(r()<p)hits++;return hits}
const add=(dest:Reward,kind:EventKind,v:number)=>{dest[kind]+=v};

/** One run from the same seeded per-wave environment across candidates. */
function simulate(scenario:Scenario,extra:string|null,seed:number):Reward{
 const parts=emptyReward();
 const active=[...scenario.history.map(clean),...(extra?[clean(extra)]:[])];
 const count=(k:Mechanics)=>active.filter(x=>MECHANICS[x]===k).length;
 const massesInStack=active.filter(x=>x.toLowerCase().includes('mass')).length;
 const totalOfferings=active.length;
 const killFactor=scenario.profile.killSpeed==='fast'?1.3:scenario.profile.killSpeed==='slow'?.63:1;
 const travelFactor=scenario.profile.mobility==='high'?1.1:scenario.profile.mobility==='low'?.7:1;
 const effort=60*killFactor*travelFactor;
 const remaining=remainingWaves(scenario);
 for(let w=0;w<remaining;w++){
  const r=random(hash(seed+Math.imul(w+1,0x9e3779b1)));
  // Chaos is a RANDOM replacement of the first future wave, never a chosen Chaos subtype.
  if(extra && MECHANICS[clean(extra)]==='chaos'&&w===0){
   const chaosOutcomes=[{weight:1,low:90,high:310},{weight:1,low:50,high:220},{weight:1,low:65,high:190},{weight:2,low:35,high:180}];
   let x=r()*chaosOutcomes.reduce((a,o)=>a+o.weight,0),o=chaosOutcomes[0]!;
   for(const candidate of chaosOutcomes){x-=candidate.weight;if(x<=0){o=candidate;break}}
   add(parts,'Chaos',(o.low+(o.high-o.low)*r())*killFactor);
   if(scenario.profile.warPlanNodes.includes('Bedlam'))add(parts,'Chaos',50);
   continue;
  }
  let time=effort;
  const rate=1+count('hordes')*.3;
  let masses=poisson(3*rate,r)+count('burst')*2;
  let fiends=poisson(2*rate,r);
  let spires=poisson(1.1*rate,r)+count('rising');
  let lords=count('summonLord')?poisson(.9*count('summonLord'),r):0;
  const generated=masses+fiends+spires+lords;
  let hells=count('summonHell')?binomial(generated,Math.min(.8,count('summonHell')*.2),r):0;
  hells+=count('burnHell')||count('meteorHell')?binomial(2,.6,r):0;
  hells+=count('ambushHell')?binomial(generated,.12,r):0;
  hells*=1+count('surgeHell');
  const aMass=3+count('puff')*(totalOfferings+massesInStack);
  const aFiend=4+count('exaltFiend')*2;
  const aHell=4+count('exaltHell')+2*count('burnHell')+count('ambushHell');
  const aLord=6+count('colossal')*8+count('ruthless')*5;
  const aSpire=5+count('precious')*6+count('treasured')*5+count('coveted')*4;
  const expend=(cost:number)=>{if(time<cost)return false;time-=cost;return true};
  let tries=0;
  while(masses>0&&tries++<140&&expend(2)){
   masses--;add(parts,'Mass',aMass);
   if(count('reform')&&r()<1-Math.pow(.7,count('reform')))masses++;
   if(count('teem')&&r()<1-Math.pow(.5,count('teem')))fiends++;
   if(count('hellish')&&r()<1-Math.pow(.5,count('hellish')))hells++;
   if(count('anchor')&&r()<1-Math.pow(.5,count('anchor')))spires++;
  }
  tries=0;
  while(fiends>0&&tries++<130&&expend(2.8)){fiends--;add(parts,'Fiend',aFiend);if(count('legions')&&r()<.4)lords++}
  tries=0;
  while(hells>0&&tries++<130&&expend(2.8)){hells--;add(parts,'Hellborne',aHell)}
  tries=0;
  while(lords>0&&tries++<130&&expend(5)){lords--;add(parts,'Lord',aLord)}
  tries=0;
  while(spires>0&&tries++<130&&expend(8)){spires--;add(parts,'Spire',aSpire)}
  if(count('goblins')&&time>=3&&r()<.5)add(parts,'Other',count('goblins')*15);
  if(count('stalking')&&w===0)add(parts,'Other',80);
 }
 return parts;
}
const sum=(r:Reward)=>Object.values(r).reduce((a,b)=>a+b,0);
function explain(name:string,s:Scenario,gain:number,parts:Reward):string[]{
 const earlier=s.history,has=(n:string)=>earlier.includes(n);
 const effect=MECHANICS[clean(name)],remain=remainingWaves(s);
 let reasons:string[]=[];
 switch(effect){
  case 'burst':reasons.push('Creates two additional starting Masses in each of the '+remain+' remaining waves.');if(has('The Puffing Masses'))reasons.push('Your Puffing Masses boosts Aether from each new Mass.');if(has('The Massing Masses'))reasons.push('Massing Masses can reform those Masses for further payouts.');if(has('The Hellish Masses')||has('The Teeming Masses'))reasons.push('More Mass deaths trigger your existing secondary spawns.');break;
  case 'anchor':reasons.push('Mass deaths may generate Spires, but completing them competes for limited wave time.');if(has('The Puffing Masses'))reasons.push('As another Mass-category offer, Anchored also increases your Puffing payout per Mass.');break;
  case 'exaltHell':reasons.push('Adds modeled Aether per Hellborne killed; it does not spawn any Hellborne.');if(!earlier.some(x=>['The Hellish Masses','The Summoned Hellborne','The Burning Hellborne','The Meteoric Hellborne'].includes(x)))reasons.push('No existing Hellborne-spawning offer recorded, so direct value may be zero until you acquire one.');break;
  case 'hellish':reasons.push('Mass deaths can produce Hellborne, pairing well with Mass proliferation and Hellborne payout bonuses.');break;
  case 'teem':reasons.push('Mass kills generate additional Fiend events in this provisional variant; verify your in-game tooltip.');break;
  case 'puff':reasons.push('Increases the payout of destroyed Masses based on your accumulated offering stack, double-counting Mass-category choices.');break;
  case 'reform':reasons.push('Destroyed Masses may reform, creating repeated payouts and additional on-death triggers.');break;
  case 'chaos':reasons.push('Replaces the upcoming wave with one UNKNOWN random Chaos outcome; it is not extra free Aether.');if(s.profile.warPlanNodes.includes('Bedlam'))reasons.push('Your Bedlam War Plan was included as a provisional Chaos reward.');break;
  case 'colossal':case 'ruthless':case 'legions':case 'summonLord':reasons.push('Improves a Lord-focused engine; performance depends on killing Lords quickly.');break;
  default:reasons.push('Estimated using event spawns, payouts and available wave-clear time under uncalibrated assumptions.');
 }
 const lead=Object.entries(parts).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>3).slice(0,2);
 if(lead.length)reasons.push('Largest modeled contributions: '+lead.map(([kind,value])=>kind+' '+(value>=0?'+':'')+Math.round(value)).join(', ')+' Aether.');
 if(remain===0)reasons.push('No waves remain after this selection; persistent effects have no modeled payoff.');
 const puffing=earlier.some(x=>MECHANICS[clean(x)]==='puff');
 if(puffing&&!clean(name).toLowerCase().includes('mass')&&parts.Mass>0&&parts.Mass>=gain/2)
  reasons.unshift('Most of this value comes from your Puffing Masses, which pays +1 Aether per Mass for every offering in your stack. Any pick adds about '+Math.round(parts.Mass)+' Mass Aether.');
 if(gain<0)reasons.push('This option has a negative modeled marginal return in the remaining wave-time budget.');
 return reasons;
}
export function compareScenario(s:Scenario,candidates:string[],samples=420):Comparison{
 const n=Math.max(100,Math.min(1600,Math.round(samples)));
 const assessments:OfferAssessment[]=[];
 const unique=[...new Set(candidates.map(x=>x.trim()).filter(Boolean))];
 for(const offer of unique){
  if(!hasMechanics(offer)){
   assessments.push({offer,modeled:false,reason:'Its exact Season 15 effect is not represented in the simulator. Unranked does NOT mean +0 Aether.'});continue;
  }
  const draws:number[]=[],components=emptyReward();
  for(let i=0;i<n;i++){
   const seed=hash(0x15a4b4+i*9733),before=simulate(s,null,seed),after=simulate(s,offer,seed);
   draws.push(sum(after)-sum(before));
   for(const kind of Object.keys(components) as EventKind[])components[kind]+=(after[kind]-before[kind])/n;
  }
  draws.sort((a,b)=>a-b);
  const mean=draws.reduce((a,b)=>a+b,0)/n;
  assessments.push({offer,modeled:true,mean,low:draws[Math.floor(n*.05)]??mean,high:draws[Math.floor(n*.95)]??mean,components,reasons:explain(offer,s,mean,components),assumptions:[
   'Event arrival rates, Chaos outcome frequencies and clear-time costs are provisional, not measured.',
   'Future offering choices and Black Pact opportunity cost are not included.',
   'Ranges reflect simulated outcomes, NOT calibrated statistical confidence intervals.'
  ]});
 }
 const modeled=assessments.filter((x):x is Estimate=>x.modeled).sort((a,b)=>b.mean-a.mean);
 const unknown=assessments.filter((x):x is Unsupported=>!x.modeled);
 return {assessments:[...modeled,...unknown],recommended:modeled[0]?.offer??null,
  conditional:unknown.length>0,samples:n,modelVersion:RECOMMENDER_VERSION,
  warnings:[
   ...(unknown.length?['Some options have unmodeled mechanics; a modeled winner is provisional and may not actually be best.']:[]),
   'Expected Aether gains are experimental approximations, not verified gameplay results.'
  ]};
}
