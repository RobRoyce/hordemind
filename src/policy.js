import {offers,byName} from "./catalog.js";
import {evaluate,simulate,random} from "./engine.js";

// This is a scenario-based *planning* model, NOT a measured probability model.
// Unknown probabilities are exposed and the optimizer reports sensitivity.
const pool=offers.filter(x=>!x.effect.startsWith("unknown")&&x.kind!=="hazard");
function offerWeight(name,history,warNodes,assumptions={}){
 const o=byName[name],last=byName[history.at(-1)];
 let w=1;
 if((warNodes||[]).includes("Method and Madness")&&o?.kind===last?.kind)w*=assumptions.methodBiasMultiplier||2;
 if((warNodes||[]).includes("Total Chaos")&&o?.effect==="chaos")w*=assumptions.chaosBiasMultiplier||3;
 return w;
}
export function sampleOffer(history,warNodes,r,kind=null,assumptions={}){
 const candidates=pool.filter(o=>(!kind||o.kind===kind)&&!((warNodes||[]).includes("Reign in Hell")&&o.effect==="chaos"));
 if(!candidates.length)return null;
 const weights=candidates.map(o=>offerWeight(o.name,history,warNodes,assumptions));
 let v=r()*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<candidates.length;i++){v-=weights[i];if(v<=0)return candidates[i].name}
 return candidates.at(-1).name;
}
// Future regular choices are unknown. Each sampled future offer set is only a scenario.
export function futureOpportunity(state,{scenarios=36,draws=3}={}){
 if(!state.specialEnabled||!state.specialAvailable)return null;
 const remaining=Math.max(0,Number(state.waves)-Number(state.wave));
 if(!remaining)return {remaining:0,mean:0,lo:0,hi:0,method:"none",caveat:"No future waves remain."};
 const r=random(20261510);
 const premiumByWave=Array.from({length:remaining},()=>[]);
 const samples=Math.max(8,Math.min(60,scenarios));
 for(let scenario=0;scenario<samples;scenario++){
  const history=[...(state.history||[])];
  for(let j=0;j<remaining;j++){
   const futureWave=Number(state.wave)+j+1;
   const future={...state,wave:futureWave,history};
   const slots=(state.warNodes||[]).includes("Reign in Hell")?4:(state.warNodes||[]).includes("Total Chaos")?2:draws;
   const regular=Array.from({length:slots},()=>sampleOffer(history,state.warNodes,r,null,state.assumptions)).filter(Boolean);
   const last=byName[history.at(-1)];
   // A Black Pact selection is drawn from the last selected offering category.
   const special=sampleOffer(history,state.warNodes,r,last?.kind||null,state.assumptions);
   const all=[...new Set([...regular,special])];
   // Small samples are adequate for a sensitivity model but not for gameplay precision.
   const value=Object.fromEntries(all.map(name=>[name,evaluate(future,name,80).mean]));
   const normal=Math.max(0,...regular.map(name=>value[name]||0));
   const extra=Math.max(0,(value[special]||0)-normal);
   premiumByWave[j].push(extra);
   // Simplified future policy: take best normal offer, not perfect clairvoyance.
   const pick=regular.sort((a,b)=>(value[b]||0)-(value[a]||0))[0];
   if(pick)history.push(pick);
  }
 }
 const expectations=premiumByWave.map(xs=>xs.reduce((a,b)=>a+b,0)/xs.length);
 // Risk-neutral optimal stopping under independent future opportunity approximation.
 const values=Array(remaining+1).fill(0);
 for(let j=remaining-1;j>=0;j--)values[j]=premiumByWave[j].reduce((sum,gain)=>sum+Math.max(gain,values[j+1]),0)/premiumByWave[j].length;
 const ranges=premiumByWave.flat().sort((a,b)=>a-b);
 return {remaining,mean:values[0],lo:ranges[Math.floor(ranges.length*.1)]||0,hi:Math.max(values[0],ranges[Math.floor(ranges.length*.9)]||0),premiums:expectations,method:"scenario-optimal-stopping",caveat:"Scenario estimate only: assumes sampled regular choices and category-matched bonus offers, unknown real frequencies, no exact compounding of future selections. Not a calibrated expected value."};
}

/**
 * Receding-horizon scenario planning. Unknown future choices are sampled from
 * the *catalog*, not claimed as actual in-game offering frequencies.
 * For each sampled choice set, the policy greedily chooses the candidate with
 * the best simulated downstream yield. Chosen future offers activate only
 * on subsequent waves in simulate().
 */
export function evaluateWithLookahead(state,candidates,{scenarios=8,depth=2}={}){
 const maxRounds=Math.max(0,Math.min(Number(state.waves)-Number(state.wave),depth));
 if(!maxRounds)return candidates.map(name=>({...evaluate(state,name,Math.min(600,state.assumptions?.samples||600)),lookahead:false}));
 const trialCount=Math.max(2,Math.min(24,scenarios));
 function futureSequence(first,scenarioSeed){
  const choices=[],history=[...(state.history||[])];
  if(first)history.push(first);
  const rng=random(scenarioSeed);
  for(let j=0;j<maxRounds;j++){
   const future={...state,wave:Number(state.wave)+j+1,history:[...history]};
   const slots=(state.warNodes||[]).includes("Reign in Hell")?4:(state.warNodes||[]).includes("Total Chaos")?2:3;
   const available=[...new Set(Array.from({length:slots},()=>sampleOffer(history,state.warNodes,rng,null,state.assumptions)))].filter(Boolean);
   if(!available.length)break;
   const scored=available.map(name=>({name,value:evaluate(future,name,100).mean})).sort((a,b)=>b.value-a.value);
   choices.push(scored[0].name);
   history.push(scored[0].name);
  }
  return choices;
 }
 const result=candidates.map(name=>({name,gains:[],followups:{}}));
 for(let k=0;k<trialCount;k++){
  const sseed=0x61f3ed8+(k*41947);
  const baselineChoices=futureSequence(null,sseed);
  // A paired world seed ensures event randomness is comparable across choices.
  const worldSeed=0xf213b6+k*3571;
  const baseline=simulate(state,null,worldSeed,baselineChoices).total;
  for(const item of result){
   const future=futureSequence(item.name,sseed);
   const withOffer=simulate(state,item.name,worldSeed,future).total;
   item.gains.push(withOffer-baseline);
   for(const offer of future)item.followups[offer]=(item.followups[offer]||0)+1;
  }
 }
 return result.map(item=>{
  const values=item.gains.sort((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/values.length;
  const sorted=Object.entries(item.followups).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  const immediate=evaluate(state,item.name,Math.min(300,state.assumptions?.samples||300));
  return {...immediate,name:item.name,mean,lo:values[Math.floor(values.length*.05)],hi:values[Math.floor(values.length*.95)],lookahead:true,planningDepth:maxRounds,scenarios:trialCount,followupExamples:sorted,
    note:"Lookahead uses synthetic future offer pools and greedy decisions; intervals reflect hypothetical scenarios, not measured game probabilities."};
 }).sort((a,b)=>b.mean-a.mean);
}
