import type {RunRecord} from '../domain/schema';
import {analyze,newAnalysisCache,pruneAnalysisCache} from './analyze';

interface AnalyzeRequest{requestId:number;kind:'analyze';runs:RunRecord[];profileId:string|null}
type Request=AnalyzeRequest;

// one cache for the worker's lifetime; each request drops entries for runs it no longer holds
const cache=newAnalysisCache();

self.onmessage=(event:MessageEvent<Request>)=>{
 const msg=event.data;
 try{
  switch(msg.kind){
   case 'analyze':{
    const result=analyze(msg.runs,msg.profileId,undefined,cache);
    pruneAnalysisCache(cache,msg.runs);
    self.postMessage({requestId:msg.requestId,result});
    break;
   }
  }
 }catch(error){
  self.postMessage({requestId:msg.requestId,error:String(error instanceof Error?error.message:error)});
 }
};
