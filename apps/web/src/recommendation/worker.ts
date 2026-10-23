import {compareScenario,type Scenario} from './model';

interface Request {requestId:number;scenario:Scenario;offered:string[];samples:number}
self.onmessage=(event:MessageEvent<Request>)=>{
 const {requestId,scenario,offered,samples}=event.data;
 try{
  self.postMessage({requestId,result:compareScenario(scenario,offered,samples)});
 }catch(error){
  self.postMessage({requestId,error:String(error instanceof Error?error.message:error)});
 }
};
