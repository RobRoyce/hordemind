import {useCallback,useEffect,useRef,useState} from 'react';
import type {LocalState} from '../domain/schema';
import {syncConfig} from '../sync/config';
import type {SupabaseSync,SyncReport,SyncUser} from '../sync/supabase';

const config=syncConfig();

// The Supabase client loads in its own chunk, and only in builds with sync configured.
const client:Promise<SupabaseSync>|null=config?import('../sync/supabase').then(m=>m.SupabaseSync.create(config)):null;
const AUTO_KEY='hordemind-sync-auto';
const AUTO_DELAY_MS=4000;

export type SyncPhase='unavailable'|'signed-out'|'idle'|'syncing'|'synced'|'error';
export interface SyncState{
 phase:SyncPhase;server:string|null;user:SyncUser|null;last:SyncReport|null;error:string;auto:boolean;
}
export interface SyncControls{
 signIn(email:string,password:string):Promise<void>;
 signUp(email:string,password:string):Promise<void>;
 signOut():Promise<void>;
 syncNow():Promise<void>;
 setAuto(on:boolean):void;
}
const readAuto=()=>{try{return localStorage.getItem(AUTO_KEY)==='1'}catch{return false}};

/**
 * Private sync is off until the user signs in on this device. Each sync merges the
 * account's records into local state through `adopt`, which never discards local events.
 */
export function useSync(data:LocalState,adopt:(remote:LocalState)=>void,enabled:boolean):[SyncState,SyncControls]{
 const [state,setState]=useState<SyncState>({phase:client?'signed-out':'unavailable',server:config?.url??null,user:null,last:null,error:'',auto:readAuto()});
 const latest=useRef(data);latest.current=data;
 const running=useRef(false);

 useEffect(()=>{
  if(!client)return;
  client.then(c=>c.user()).then(user=>setState(s=>({...s,user,phase:user?'idle':'signed-out'}))).catch(()=>{});
 },[]);

 const syncNow=useCallback(async()=>{
  if(!client||running.current||!enabled)return;
  running.current=true;
  setState(s=>({...s,phase:'syncing',error:''}));
  try{
   const {state:merged,report}=await (await client).sync(latest.current);
   adopt(merged);
   setState(s=>({...s,phase:'synced',last:report,error:''}));
  }catch(e){
   setState(s=>({...s,phase:'error',error:e instanceof Error?e.message:String(e)}));
  }finally{running.current=false}
 },[adopt,enabled]);

 const signedIn=async(user:SyncUser)=>{setState(s=>({...s,user,phase:'idle',error:''}));await syncNow()};
 const controls:SyncControls={
  async signIn(email,password){
   if(!client)return;
   try{await signedIn(await (await client).signIn(email,password))}catch(e){setState(s=>({...s,error:e instanceof Error?e.message:String(e)}))}
  },
  async signUp(email,password){
   if(!client)return;
   try{await signedIn(await (await client).signUp(email,password))}catch(e){setState(s=>({...s,error:e instanceof Error?e.message:String(e)}))}
  },
  async signOut(){
   if(!client)return;
   try{await (await client).signOut();setState(s=>({...s,user:null,phase:'signed-out',last:null,error:''}))}
   catch(e){setState(s=>({...s,error:e instanceof Error?e.message:String(e)}))}
  },
  syncNow,
  setAuto(on){
   try{localStorage.setItem(AUTO_KEY,on?'1':'0')}catch{}
   setState(s=>({...s,auto:on}));
  }
 };

 // Optional: sync a few seconds after local changes settle.
 useEffect(()=>{
  if(!state.auto||!state.user||!enabled)return;
  const timer=window.setTimeout(()=>{void syncNow()},AUTO_DELAY_MS);
  return()=>window.clearTimeout(timer);
 },[data,state.auto,state.user,enabled,syncNow]);

 return [state,controls];
}
