import {EMPTY_STATE,LocalStateSchema,type LocalState} from '../domain/schema';

export const STORAGE_KEY='hordemind-v2-local-v1';
export interface StateRepository{
 load():LocalState;
 save(next:LocalState):void;
 export():string;
}
export function createLocalRepository():StateRepository{
 return {
  load(){
   try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return structuredClone(EMPTY_STATE);
    const parsed=LocalStateSchema.safeParse(JSON.parse(raw));
    if(parsed.success)return parsed.data;
    // Preserve invalid data in localStorage; no destructive reset.
    console.warn('HordeMind: stored state could not be decoded. Original bytes preserved.');
   }catch(err){console.warn('HordeMind: local state unavailable',err)}
   return structuredClone(EMPTY_STATE);
  },
  save(next){
   const valid=LocalStateSchema.parse(next);
   localStorage.setItem(STORAGE_KEY,JSON.stringify(valid));
  },
  export(){return JSON.stringify({exportedAt:new Date().toISOString(),product:'HordeMind v2',state:this.load()},null,2)}
 };
}
export function downloadExport(json:string){
 const blob=new Blob([json],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='hordemind-runs-'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
