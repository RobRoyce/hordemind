import {EMPTY_STATE,LocalStateSchema,type LocalState} from '../domain/schema';

export const STORAGE_KEY='hordemind-v2-local-v1';
export const BACKUP_KEY=STORAGE_KEY+'-unreadable-backup';

/**
 * `unreadable`: stored data exists but failed validation, e.g. it was written by a
 * newer app version. The caller must not save over it without the user's consent.
 */
export type LoadStatus='ok'|'empty'|'unreadable'|'unavailable';
export interface LoadResult{state:LocalState;status:LoadStatus;backupKey?:string}
export interface StateRepository{
 load():LoadResult;
 /** Writes only when the serialized state differs from what is stored. */
 save(next:LocalState):void;
 /** Validates state written by another tab. */
 parse(raw:string):LocalState|null;
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
    // One fixed backup slot, rewritten only when the unreadable data changes.
    let backupKey:string|undefined=BACKUP_KEY;
    try{if(storage?.getItem(BACKUP_KEY)!==raw)storage?.setItem(BACKUP_KEY,raw)}catch{backupKey=undefined}
    console.warn('HordeMind: stored state could not be decoded; it is left untouched under',STORAGE_KEY);
    return {state:structuredClone(EMPTY_STATE),status:'unreadable',...(backupKey?{backupKey}:{})};
   }catch(err){
    console.warn('HordeMind: local state unavailable',err);
    return {state:structuredClone(EMPTY_STATE),status:'unavailable'};
   }
  },
  save(next){
   if(!storage)throw new Error('Browser storage is unavailable');
   const json=JSON.stringify(LocalStateSchema.parse(next));
   if(storage.getItem(STORAGE_KEY)!==json)storage.setItem(STORAGE_KEY,json);
  },
  parse(raw){
   try{const parsed=LocalStateSchema.safeParse(JSON.parse(raw));return parsed.success?parsed.data:null}catch{return null}
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
