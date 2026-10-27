import type {RunRecord} from '../domain/schema';
import {analyze} from './analyze';

interface AnalyzeRequest{requestId:number;kind:'analyze';runs:RunRecord[];profileId:string|null}
type Request=AnalyzeRequest;

self.onmessage=(event:MessageEvent<Request>)=>{
 const msg=event.data;
 try{
  switch(msg.kind){
   case 'analyze':self.postMessage({requestId:msg.requestId,result:analyze(msg.runs,msg.profileId)});break;
  }
 }catch(error){
  self.postMessage({requestId:msg.requestId,error:String(error instanceof Error?error.message:error)});
 }
};
