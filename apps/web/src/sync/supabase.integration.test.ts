/**
 * Runs against a live local Supabase stack (`make verify-db` sets the env).
 * Skipped otherwise, so `npm test` needs no Docker.
 */
import {describe,it,expect,beforeAll} from 'vitest';
import {SupabaseSync} from './supabase';
import {newProfile,newRun,recordDecision,undoChoice} from '../domain/run';
import {EMPTY_STATE,type LocalState,type RunRecord} from '../domain/schema';

const url=import.meta.env.HORDEMIND_SUPABASE_URL as string|undefined;
const key=import.meta.env.HORDEMIND_SUPABASE_KEY as string|undefined;
const phase=import.meta.env.HORDEMIND_RESTART_PHASE as 'write'|'read'|undefined;
const restartRunId=import.meta.env.HORDEMIND_RESTART_RUN as string|undefined;
const live=Boolean(url&&key);

const device=()=>SupabaseSync.create({url:url!,key:key!},{persistSession:false});
const password='hordemind-local-test-only';
const state=(runs:RunRecord[],profiles=runs.map(r=>{const s=r.events[0];return s?.type==='run_started'?s.payload.profile:newProfile('x','Paladin')})):LocalState=>({...structuredClone(EMPTY_STATE),profiles,runs});
function sampleRun(id?:string){
 let run=newRun({...newProfile('Sync Paladin','Paladin'),difficulty:'Torment XII'},4);
 if(id)run={...run,id,events:run.events.map(e=>({...e,runId:id}))};
 run=recordDecision(run,{offered:['The Puffing Masses','The Hellish Masses'],chosenIndex:0});
 run=recordDecision(run,{offered:['The Bursting Masses','Chaotic Offering'],chosenIndex:1,observation:{totalAether:48,eventCounts:{mass:5}}});
 return undoChoice(run);
}
async function eventCount(d:SupabaseSync,runId:string){
 const {count,error}=await d.client.from('run_events').select('id',{count:'exact',head:true}).eq('run_id',runId);
 if(error)throw error;
 return count;
}

describe.runIf(live&&!phase)('private sync against local Supabase',()=>{
 // Created in beforeAll: skipped suites still run this body while collecting tests.
 let alice:SupabaseSync,bob:SupabaseSync,aliceLaptop:SupabaseSync;
 let aliceId='';
 const run=sampleRun();
 beforeAll(async()=>{
  [alice,bob,aliceLaptop]=[device(),device(),device()];
  const tag=crypto.randomUUID().slice(0,8);
  aliceId=(await alice.signUp(`alice-${tag}@hordemind.invalid`,password)).id;
  await bob.signUp(`bob-${tag}@hordemind.invalid`,password);
  await aliceLaptop.signIn(`alice-${tag}@hordemind.invalid`,password);
 });

 it('round-trips profiles and the full journal, corrections included',async()=>{
  await alice.sync(state([run]));
  const pulled=await alice.pull();
  expect(pulled.runs).toEqual([run]);
  expect(pulled.profiles.map(p=>p.name)).toEqual(['Sync Paladin']);
 });
 it('is idempotent: syncing again adds no events',async()=>{
  const before=await eventCount(alice,run.id);
  await alice.sync(state([run]));
  await alice.push(state([run]),aliceId);
  expect(await eventCount(alice,run.id)).toBe(before);
  expect(before).toBe(run.events.length);
 });
 it('merges a second device: each keeps the other’s runs',async()=>{
  const laptopRun=sampleRun();
  const {state:merged}=await aliceLaptop.sync(state([laptopRun]));
  expect(merged.runs.map(r=>r.id).sort()).toEqual([run.id,laptopRun.id].sort());
  const {state:back}=await alice.sync(state([run]));
  expect(back.runs.map(r=>r.id)).toContain(laptopRun.id);
 });
 it('isolates owners: another account sees and changes nothing',async()=>{
  expect((await bob.pull()).runs).toEqual([]);
  const forged={run_id:run.id,client_event_id:crypto.randomUUID(),sequence_no:999,event_schema_version:1,event_type:'correction',
   event_payload:{targetEventIds:[run.events[1]!.id],explanation:'forged'},recorded_at:new Date().toISOString(),client_version:'attacker'};
  const {error:insert}=await bob.client.from('run_events').insert(forged);
  expect(insert).not.toBeNull();
  const {data:updated}=await bob.client.from('runs').update({run_status:'abandoned'}).eq('id',run.id).select();
  expect(updated).toEqual([]);
  expect(await eventCount(alice,run.id)).toBe(run.events.length);
 });
 it('keeps recorded events immutable, even for their owner',async()=>{
  const {error:update}=await alice.client.from('run_events').update({event_payload:{}}).eq('run_id',run.id);
  const {error:remove}=await alice.client.from('run_events').delete().eq('run_id',run.id);
  expect(update?.message).toMatch(/permission denied/);
  expect(remove?.message).toMatch(/permission denied/);
  expect(await eventCount(alice,run.id)).toBe(run.events.length);
 });
});

// Two invocations around a database container restart; see scripts/verify-local.sh.
describe.runIf(live&&phase!==undefined&&restartRunId!==undefined)('records survive a database restart',()=>{
 const email=`restart-${restartRunId?.slice(0,8)}@hordemind.invalid`;
 it(`phase: ${phase}`,async()=>{
  const d=device();
  if(phase==='write'){
   await d.signUp(email,password);
   await d.sync(state([sampleRun(restartRunId)]));
  }else{
   await d.signIn(email,password);
   const pulled=await d.pull();
   expect(pulled.runs.find(r=>r.id===restartRunId)?.events.length).toBe(sampleRun(restartRunId).events.length);
  }
 });
});
