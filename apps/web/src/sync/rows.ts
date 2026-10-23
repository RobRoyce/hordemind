/**
 * Mapping between the local journal and the Postgres schema in supabase/migrations.
 * Pure functions, so round trips are testable without a database.
 */
import {CharacterProfileSchema,EventSchema,type CharacterProfile,type RunEvent,type RunRecord} from '../domain/schema';

/** The game season the current catalog targets; `runs.season` must be positive. */
export const CATALOG_SEASON=15;

export interface ProfileRow{id:string;owner_id:string;display_name:string;class_id:string;profile:CharacterProfile;updated_at:string}
export interface RunRow{
 id:string;owner_id:string;profile_id:string|null;game_patch:string;season:number;
 profile_snapshot:CharacterProfile;run_status:RunRecord['status'];started_at:string;completed_at:string|null;
}
export interface EventRow{
 run_id:string;client_event_id:string;sequence_no:number;event_schema_version:number;
 event_type:RunEvent['type'];event_payload:RunEvent['payload'];recorded_at:string;client_version:string;
}

/** Postgres returns `+00:00` offsets and microseconds; the journal stores `Z` with milliseconds. */
const iso=(t:string)=>new Date(t).toISOString();

export function profileToRow(p:CharacterProfile,owner:string):ProfileRow{
 return {id:p.id,owner_id:owner,display_name:p.name,class_id:p.className,profile:p,updated_at:p.updatedAt};
}
export function profileFromRow(row:ProfileRow):CharacterProfile{
 return CharacterProfileSchema.parse({...row.profile,updatedAt:iso(row.profile.updatedAt??row.updated_at)});
}

function started(run:RunRecord){
 const e=run.events.find(x=>x.type==='run_started');
 if(e?.type!=='run_started')throw new Error(`Run ${run.id} has no start event`);
 return e;
}
export function runToRow(run:RunRecord,owner:string,syncedProfiles:ReadonlySet<string>):RunRow{
 const start=started(run),finished=run.events.filter(e=>e.type==='run_finished').at(-1);
 return {
  id:run.id,owner_id:owner,
  profile_id:syncedProfiles.has(start.payload.profile.id)?start.payload.profile.id:null,
  game_patch:start.payload.gamePatch,season:CATALOG_SEASON,profile_snapshot:start.payload.profile,
  run_status:run.status,started_at:run.createdAt,completed_at:finished?.at??null
 };
}
export function eventToRow(e:RunEvent):EventRow{
 return {run_id:e.runId,client_event_id:e.id,sequence_no:e.sequence,event_schema_version:e.schemaVersion,
  event_type:e.type,event_payload:e.payload,recorded_at:e.at,client_version:e.clientVersion};
}
export function eventFromRow(row:EventRow):RunEvent{
 return EventSchema.parse({id:row.client_event_id,runId:row.run_id,schemaVersion:row.event_schema_version,sequence:row.sequence_no,
  clientVersion:row.client_version,at:iso(row.recorded_at),type:row.event_type,payload:row.event_payload});
}
export function runFromRows(run:RunRow,events:EventRow[]):RunRecord{
 return {id:run.id,createdAt:iso(run.started_at),status:run.run_status,researchConsent:false,
  events:[...events].sort((a,b)=>a.sequence_no-b.sequence_no).map(eventFromRow)};
}
