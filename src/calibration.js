import {simulate} from "./engine.js";
// Aggregate calibration only. Total-Aether measurements cannot identify
// separate event probabilities or prove individual offering effects.
export function fitCalibration(state,{seeds=24}={}){
 const records=[...(state.observations||[])].filter(x=>Number.isFinite(+x.total)&&Number.isFinite(+x.wave)&&+x.wave>=1).sort((a,b)=>a.wave-b.wave);
 if(records.length<2)return {available:false,scale:1,n:records.length,reason:"At least two cumulative wave-end Aether observations are needed."};
 const history=(state.history||[]).map(o=>typeof o==="string"?o:o.name);
 const usable=records.filter(o=>o.wave<=history.length+1);
 if(usable.length<2)return {available:false,scale:1,n:records.length,reason:"Enter prior wave selections as well as at least two cumulative Aether readings."};
 const predicted=usable.map(obs=>{
  const sampleState={...state,waves:+obs.wave,wave:1,history:[]};
  let sum=0;
  for(let i=0;i<seeds;i++)sum+=simulate(sampleState,history[0]||null,2026000+i*821,history.slice(1,+obs.wave)).total;
  return {wave:+obs.wave,actual:+obs.total,prediction:sum/seeds};
 });
 const valid=predicted.filter(x=>x.prediction>0);
 if(valid.length<2)return {available:false,scale:1,n:records.length,reason:"Not enough positive simulated Aether to calibrate."};
 // Use cumulative observation/prediction ratios, shrink toward 1 until
 // repeated measurements agree; avoid overinterpreting a small number of runs.
 const ratios=valid.map(x=>x.actual/x.prediction);
 const recent=ratios.slice(-4);
 const avg=recent.reduce((a,b)=>a+b,0)/recent.length;
 const strength=Math.min(.7,.18*valid.length);
 const scale=Math.max(.5,Math.min(3,1+(avg-1)*strength));
 const error=valid.map((x,i)=>Math.abs(x.actual-x.prediction*scale)/Math.max(1,x.actual)).reduce((a,b)=>a+b,0)/valid.length;
 return {available:true,scale,meanAbsoluteRelativeError:error,n:valid.length,observed:predicted,
  reason:"Coarse overall yield rescaling, not per-event calibration. It cannot infer spawn rates, future offer odds, or correct ordering errors."};
}
export function applyCalibration(results,cal){
 if(!cal?.available)return results;
 return results.map(o=>({...o,mean:o.mean*cal.scale,lo:o.lo*cal.scale,hi:o.hi*cal.scale,parts:Object.fromEntries(Object.entries(o.parts||{}).map(([k,v])=>[k,v*cal.scale])),calibrated:true,calibrationScale:cal.scale}));
}
