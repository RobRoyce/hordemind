/**
 * Private sync to a Supabase project the user signs in to (local Docker stack for now).
 *
 * The browser journal stays the source of truth. A sync pulls the account's records,
 * merges them with local state, then pushes the merged state. Events are inserted with
 * ON CONFLICT DO NOTHING on (run_id, client_event_id), so retries never duplicate them.
 * Private sync never touches research_contributions; contributing is a separate choice.
 */
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {CharacterProfile,LocalState,RunRecord} from '../domain/schema';
import {mergeStates} from '../domain/merge';
import {eventToRow,profileFromRow,profileToRow,runFromRows,runToRow,type EventRow,type ProfileRow,type RunRow} from './rows';

export interface SyncConfig{url:string;key:string}
/** Sync is available only in builds configured with a Supabase URL and publishable key. */
export function syncConfig():SyncConfig|null{
 const url=import.meta.env.VITE_SUPABASE_URL as string|undefined,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
 return url&&key?{url,key}:null;
}
export interface SyncUser{id:string;email:string|null}
export interface SyncReport{at:string;profiles:number;runs:number;events:number}
export class SyncConflictError extends Error{
 constructor(readonly runId:string){super(`Run ${runId.slice(0,8)} was recorded differently on another device. Its local copy is kept; the other copy stays in the database.`)}
}

/** PostgREST returns at most `max_rows` (1000 locally) per request. */
const PAGE=1000,CHUNK=500;
const fail=(what:string,error:{message:string}|null)=>{if(error)throw new Error(`${what}: ${error.message}`)};

export class SupabaseSync{
 private constructor(readonly client:SupabaseClient,readonly url:string){}
 static create(config:SyncConfig,options:{persistSession?:boolean}={}){
  return new SupabaseSync(createClient(config.url,config.key,{auth:{persistSession:options.persistSession??true,storageKey:'hordemind-auth',autoRefreshToken:options.persistSession??true}}),config.url);
 }

 async user():Promise<SyncUser|null>{
  const {data}=await this.client.auth.getSession();
  const u=data.session?.user;
  return u?{id:u.id,email:u.email??null}:null;
 }
 async signUp(email:string,password:string):Promise<SyncUser>{
  const {data,error}=await this.client.auth.signUp({email,password});
  fail('Could not create the account',error);
  if(!data.session||!data.user)throw new Error('Account created; confirm the email, then sign in.');
  return {id:data.user.id,email:data.user.email??null};
 }
 async signIn(email:string,password:string):Promise<SyncUser>{
  const {data,error}=await this.client.auth.signInWithPassword({email,password});
  fail('Could not sign in',error);
  if(!data.user)throw new Error('Could not sign in: no user returned');
  return {id:data.user.id,email:data.user.email??null};
 }
 async signOut(){
  const {error}=await this.client.auth.signOut();
  fail('Could not sign out',error);
 }

 private async all<T>(table:string,columns:string,filter?:(q:any)=>any):Promise<T[]>{
  const rows:T[]=[];
  for(let from=0;;from+=PAGE){
   let q=this.client.from(table).select(columns).order('id').range(from,from+PAGE-1);
   if(filter)q=filter(q);
   const {data,error}=await q;
   fail(`Could not read ${table}`,error);
   rows.push(...(data as T[]));
   if(!data||data.length<PAGE)return rows;
  }
 }

 /** Everything this account stores. RLS limits every query to the signed-in owner. */
 async pull():Promise<{profiles:CharacterProfile[];runs:RunRecord[]}>{
  const profiles=(await this.all<ProfileRow>('character_profiles','id,owner_id,display_name,class_id,profile,updated_at')).map(profileFromRow);
  const runRows=await this.all<RunRow>('runs','id,owner_id,profile_id,game_patch,season,profile_snapshot,run_status,started_at,completed_at');
  const events=new Map<string,EventRow[]>();
  for(let i=0;i<runRows.length;i+=100){
   const ids=runRows.slice(i,i+100).map(r=>r.id);
   for(const row of await this.all<EventRow & {id:string}>('run_events','id,run_id,client_event_id,sequence_no,event_schema_version,event_type,event_payload,recorded_at,client_version',q=>q.in('run_id',ids))){
    const list=events.get(row.run_id)??[];list.push(row);events.set(row.run_id,list);
   }
  }
  return {profiles,runs:runRows.map(r=>runFromRows(r,events.get(r.id)??[]))};
 }

 /** Idempotent: profiles and runs upsert by id, events insert-or-skip by client id. */
 async push(state:LocalState,owner:string):Promise<Omit<SyncReport,'at'>>{
  if(state.profiles.length){
   const {error}=await this.client.from('character_profiles').upsert(state.profiles.map(p=>profileToRow(p,owner)),{onConflict:'id'});
   fail('Could not save characters',error);
  }
  const profileIds=new Set(state.profiles.map(p=>p.id));
  if(state.runs.length){
   const {error}=await this.client.from('runs').upsert(state.runs.map(r=>runToRow(r,owner,profileIds)),{onConflict:'id'});
   fail('Could not save runs',error);
  }
  const events=state.runs.flatMap(r=>r.events.map(eventToRow));
  for(let i=0;i<events.length;i+=CHUNK){
   const chunk=events.slice(i,i+CHUNK);
   const {error}=await this.client.from('run_events').upsert(chunk,{onConflict:'run_id,client_event_id',ignoreDuplicates:true});
   // A different event already holds this sequence number: the run diverged on another device.
   if(error?.code==='23505')throw new SyncConflictError(chunk.find(e=>error.message.includes(e.run_id))?.run_id??chunk[0]!.run_id);
   fail('Could not save run events',error);
  }
  return {profiles:state.profiles.length,runs:state.runs.length,events:events.length};
 }

 /** Pull, merge with local state, push the result. Returns the merged state to adopt locally. */
 async sync(local:LocalState):Promise<{state:LocalState;report:SyncReport}>{
  const user=await this.user();
  if(!user)throw new Error('Sign in to sync');
  const remote=await this.pull();
  const merged=mergeStates(local,{...local,profiles:remote.profiles,runs:remote.runs});
  const counts=await this.push(merged,user.id);
  return {state:merged,report:{at:new Date().toISOString(),...counts}};
 }
}
