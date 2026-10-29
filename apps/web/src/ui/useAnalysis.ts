import {useCallback,useEffect,useRef,useState} from 'react';
import type {RunRecord} from '../domain/schema';
import {analysisFor,type Analysis} from '../analysis/analyze';

export interface AnalysisState{result:Analysis|null;busy:boolean;error:string;retry:()=>void}
interface Inner{result:Analysis|null;busy:boolean;error:string}
const DEBOUNCE_MS=300;

type Reply={requestId:number;result?:Analysis;error?:string};
// One worker serves every mount, so its cache and the last result outlive the Insights screen.
let shared:Worker|null=null;
let nextId=0;
let pending:{id:number;key:string}|null=null;
let last:{key:string;result:Analysis}|null=null;
let deliver:((reply:Reply)=>void)|null=null;

function sharedWorker():Worker{
 if(shared)return shared;
 const w=new Worker(new URL('../analysis/worker.ts',import.meta.url),{type:'module'});
 w.onmessage=(event:MessageEvent<Reply>)=>{
  const reply=event.data;
  if(pending?.id===reply.requestId&&reply.result&&!reply.error)last={key:pending.key,result:reply.result};
  deliver?.(reply);
 };
 w.onerror=event=>{
  last=null;
  shared?.terminate();shared=null;
  deliver?.({requestId:pending?.id??-1,error:event.message||'The analysis stopped unexpectedly'});
 };
 return shared=w;
}

/**
 * Runs the run analysis in one shared worker. Each request carries an id,
 * and replies to superseded requests are ignored. Returning to the screen with
 * unchanged runs shows the last result at once.
 */
export function useAnalysis(runs:RunRecord[],profileId:string|null):AnalysisState{
 const key=JSON.stringify([profileId,runs.map(r=>[r.id,r.events.length,r.status])]);
 const [state,setState]=useState<Inner>(()=>({result:last?.key===key?last.result:null,busy:false,error:''}));
 const [attempt,setAttempt]=useState(0);
 const latest=useRef(0);
 const input=useRef({runs,profileId});
 input.current={runs,profileId};

 useEffect(()=>{
  const mine=(reply:Reply)=>{
   if(reply.requestId!==latest.current)return;
   setState(reply.error?{result:null,busy:false,error:reply.error}:{result:reply.result??null,busy:false,error:''});
  };
  deliver=mine;
  return ()=>{if(deliver===mine)deliver=null};
 },[]);
 useEffect(()=>{
  if(last?.key===key){
   latest.current=++nextId;
   setState({result:last.result,busy:false,error:''});
   return;
  }
  const requestId=latest.current=++nextId;
  setState(s=>({...s,busy:true,error:''}));
  const timer=window.setTimeout(()=>{
   try{
    pending={id:requestId,key};
    sharedWorker().postMessage({requestId,kind:'analyze',runs:input.current.runs,profileId:input.current.profileId});
   }catch(e){setState({result:null,busy:false,error:String(e instanceof Error?e.message:e)})}
  },DEBOUNCE_MS);
  return ()=>window.clearTimeout(timer);
  // `key` captures every input that changes the answer; `attempt` re-sends on retry.
 },[key,attempt]);
 const retry=useCallback(()=>{last=null;setAttempt(n=>n+1)},[]);
 const result=analysisFor(profileId,state.result);
 // a stored result for another character means the new one is still on its way
 const busy=state.busy||(state.result!==null&&result===null);
 return {result,busy,error:state.error,retry};
}
