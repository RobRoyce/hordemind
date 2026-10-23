import type {RunRecord} from '../domain/schema';
import {compareRun} from './model';

interface Request {requestId:number;run:RunRecord;offered:string[];samples:number}
self.onmessage=(event:MessageEvent<Request>)=>{
 const {requestId,run,offered,samples}=event.data;
 try{
  const result=compareRun(run,offered,samples);
  self.postMessage({requestId,result});
 }catch(error){
  self.postMessage({requestId,error:String(error instanceof Error?error.message:error)});
 }
};
