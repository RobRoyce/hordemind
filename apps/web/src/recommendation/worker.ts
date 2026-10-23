import {compareScenario,type Scenario} from './model';

interface Request {requestId:number;scenario:Scenario;offered:string[];samples:number;specialOffer:string|null}
self.onmessage=(event:MessageEvent<Request>)=>{
 const {requestId,scenario,offered,samples,specialOffer}=event.data;
 try{
  self.postMessage({requestId,result:compareScenario(scenario,offered,samples,{specialOffer})});
 }catch(error){
  self.postMessage({requestId,error:String(error instanceof Error?error.message:error)});
 }
};
