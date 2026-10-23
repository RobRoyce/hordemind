import {evaluate} from "./engine.js";
import {evaluateWithLookahead} from "./policy.js";
self.onmessage=(event)=>{
 const {requestId,state,candidates,lookahead}=event.data||{};
 try{
  const result=lookahead
    ?evaluateWithLookahead(state,candidates,{scenarios:8,depth:Math.min(2,Math.max(0,Number(state.waves)-Number(state.wave)))})
    :candidates.map(name=>evaluate(state,name,Math.min(5000,Number(state.assumptions?.samples)||1200))).sort((a,b)=>b.mean-a.mean);
  self.postMessage({requestId,result});
 }catch(error){self.postMessage({requestId,error:String(error?.stack||error)})}
};