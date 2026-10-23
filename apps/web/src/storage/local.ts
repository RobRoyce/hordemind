import {EMPTY_STATE,LocalStateSchema,type LocalState} from '../domain/schema';

export const STORAGE_KEY='hordemind-v2-local-v1';

/**
 * `unreadable`: stored data exists but failed validation, e.g. it was written by a
 * newer app version. The caller must not save over it without the user's consent.
 */
export type LoadStatus='ok'|'empty'|'unreadable'|'unavailable';
export interface LoadResult{state:LocalState;status:LoadStatus;backupKey?:string}
export interface StateRepository{
 load():LoadResult;
 save(next:LocalState):void;
 export(state:LocalState):string;
}
export function createLocalRepository(storage:Storage|undefined=globalThis.localStorage):StateRepository{
 return {
  load(){
   try{
    const raw=storage?.getItem(STORAGE_KEY);
    if(!raw)return {state:structuredClone(EMPTY_STATE),status:'empty'};
    let parsed;
    try{parsed=LocalStateSchema.safeParse(JSON.parse(raw))}catch{parsed=null}
    if(parsed?.success)return {state:parsed.data,status:'ok'};
    const backupKey=`${STORAGE_KEY}-unreadable-${new Date().toISOString()}`;
    try{storage?.setItem(backupKey,raw)}catch{}
    console.warn('HordeMind: stored state could not be decoded; a copy is kept under',backupKey);
    return {state:structuredClone(EMPTY_STATE),status:'unreadable',backupKey};
   }catch(err){
    console.warn('HordeMind: local state unavailable',err);
    return {state:structuredClone(EMPTY_STATE),status:'unavailable'};
   }
  },
  save(next){
   if(!storage)throw new Error('Browser storage is unavailable');
   storage.setItem(STORAGE_KEY,JSON.stringify(LocalStateSchema.parse(next)));
  },
  export(state){return JSON.stringify({exportedAt:new Date().toISOString(),product:'HordeMind v2',state},null,2)}
 };
}
export function downloadExport(json:string){
 const blob=new Blob([json],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='hordemind-runs-'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
