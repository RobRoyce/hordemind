import {useCallback,useEffect,useRef,useState} from 'react';
import type {RunRecord} from '../domain/schema';
import {analysisFor,type Analysis} from '../analysis/analyze';

export interface AnalysisState{result:Analysis|null;busy:boolean;error:string;retry:()=>void}
interface Inner{result:Analysis|null;busy:boolean;error:string}
const DEBOUNCE_MS=300;

/**
 * Runs the run analysis in one long-lived worker. Each request carries an id,
 * and replies to superseded requests are ignored.
 */
export function useAnalysis(runs:RunRecord[],profileId:string|null):AnalysisState{
 const [state,setState]=useState<Inner>({result:null,busy:false,error:''});
 const [attempt,setAttempt]=useState(0);
 const worker=useRef<Worker|null>(null);
 const latest=useRef(0);
 const input=useRef({runs,profileId});
 input.current={runs,profileId};
 const key=JSON.stringify([profileId,runs.map(r=>[r.id,r.events.length,r.status])]);

 useEffect(()=>()=>{worker.current?.terminate();worker.current=null},[]);
 useEffect(()=>{
  const requestId=++latest.current;
  setState(s=>({...s,busy:true,error:''}));
  const timer=window.setTimeout(()=>{
   try{
    if(!worker.current){
     const w=new Worker(new URL('../analysis/worker.ts',import.meta.url),{type:'module'});
     w.onmessage=(event:MessageEvent<{requestId:number;result?:Analysis;error?:string}>)=>{
      if(event.data.requestId!==latest.current)return;
      setState(event.data.error?{result:null,busy:false,error:event.data.error}:{result:event.data.result??null,busy:false,error:''});
     };
     w.onerror=event=>{setState({result:null,busy:false,error:event.message||'The analysis stopped unexpectedly'});worker.current?.terminate();worker.current=null};
     worker.current=w;
    }
    worker.current.postMessage({requestId,kind:'analyze',runs:input.current.runs,profileId:input.current.profileId});
   }catch(e){setState({result:null,busy:false,error:String(e instanceof Error?e.message:e)})}
  },DEBOUNCE_MS);
  return ()=>window.clearTimeout(timer);
  // `key` captures every input that changes the answer; `attempt` re-sends on retry.
 },[key,attempt]);
 const retry=useCallback(()=>setAttempt(n=>n+1),[]);
 const result=analysisFor(profileId,state.result);
 // a stored result for another character means the new one is still on its way
 const busy=state.busy||(state.result!==null&&result===null);
 return {result,busy,error:state.error,retry};
}
