import {offers,byName} from "./catalog.js";
import {evaluate,random} from "./engine.js";

// This is a scenario-based *planning* model, NOT a measured probability model.
// Unknown probabilities are exposed and the optimizer reports sensitivity.
const pool=offers.filter(x=>!x.effect.startsWith("unknown")&&x.effect!=="chaos"&&x.kind!=="hazard");
function offerWeight(name,history,warNodes){
 const o=byName[name],last=byName[history.at(-1)];
 let w=1;
 if((warNodes||[]).includes("Method and Madness")&&o?.kind===last?.kind)w*=2;
 return w;
}
export function sampleOffer(history,warNodes,r,kind=null){
 const candidates=pool.filter(o=>!kind||o.kind===kind);
 if(!candidates.length)return null;
 const weights=candidates.map(o=>offerWeight(o.name,history,warNodes));
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
   const regular=Array.from({length:draws},()=>sampleOffer(history,state.warNodes,r)).filter(Boolean);
   const last=byName[history.at(-1)];
   // A Black Pact selection is drawn from the last selected offering category.
   const special=sampleOffer(history,state.warNodes,r,last?.kind||null);
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
