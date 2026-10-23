import {useEffect,useRef,useState} from 'react';
import type {Comparison,Scenario} from '../recommendation/model';

export interface RecommendationState{result:Comparison|null;busy:boolean;error:string}
const SAMPLES=400;
const DEBOUNCE_MS=120;

/**
 * Runs the simulator in one long-lived worker. Each request carries an id;
 * answers to superseded requests are ignored, so fast typing never shows stale rankings.
 */
export function useRecommendations(scenario:Scenario|null,offers:string[]):RecommendationState{
 const [state,setState]=useState<RecommendationState>({result:null,busy:false,error:''});
 const worker=useRef<Worker|null>(null);
 const latest=useRef(0);
 const key=scenario&&offers.length>=2?JSON.stringify([scenario,offers]):'';

 useEffect(()=>()=>{worker.current?.terminate();worker.current=null},[]);
 useEffect(()=>{
  // Invalidate any reply still in flight for the previous offer set.
  if(!key||!scenario){latest.current++;setState({result:null,busy:false,error:''});return}
  const requestId=++latest.current;
  setState(s=>({...s,busy:true,error:''}));
  const timer=window.setTimeout(()=>{
   try{
    if(!worker.current){
     const w=new Worker(new URL('../recommendation/worker.ts',import.meta.url),{type:'module'});
     w.onmessage=(event:MessageEvent<{requestId:number;result?:Comparison;error?:string}>)=>{
      if(event.data.requestId!==latest.current)return;
      setState(event.data.error?{result:null,busy:false,error:event.data.error}:{result:event.data.result??null,busy:false,error:''});
     };
     w.onerror=event=>{setState({result:null,busy:false,error:event.message||'The simulator stopped unexpectedly'});worker.current?.terminate();worker.current=null};
     worker.current=w;
    }
    worker.current.postMessage({requestId,scenario,offered:offers,samples:SAMPLES});
   }catch(e){setState({result:null,busy:false,error:String(e instanceof Error?e.message:e)})}
  },DEBOUNCE_MS);
  return ()=>window.clearTimeout(timer);
  // `key` captures every input that changes the answer.
 },[key]);
 return state;
}
