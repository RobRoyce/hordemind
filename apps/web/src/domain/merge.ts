import type {LocalState,RunRecord} from './schema';

/** True when `a`'s events are an exact prefix of `b`'s. */
const prefixOf=(a:RunRecord,b:RunRecord)=>a.events.length<=b.events.length&&a.events.every((e,i)=>b.events[i]?.id===e.id);

/**
 * Combines this tab's state with state another tab saved. Run journals are append-only,
 * so the longer of two copies of a run normally contains the other. Profiles keep the
 * newest edit. Active selections stay per-tab when they still exist.
 */
export function mergeStates(mine:LocalState,theirs:LocalState):LocalState{
 const profiles=new Map(theirs.profiles.map(p=>[p.id,p]));
 for(const p of mine.profiles){
  const other=profiles.get(p.id);
  if(!other||p.updatedAt>other.updatedAt)profiles.set(p.id,p);
 }
 const runs=new Map(theirs.runs.map(r=>[r.id,r]));
 for(const r of mine.runs){
  const other=runs.get(r.id);
  // Diverged journals cannot interleave; keep the longer one rather than drop both.
  if(!other||prefixOf(other,r)||!prefixOf(r,other)&&r.events.length>other.events.length)runs.set(r.id,r);
 }
 const order=[...mine.runs.map(r=>r.id),...theirs.runs.map(r=>r.id)];
 const keep=<T extends string|null>(id:T,has:(id:string)=>boolean,fallback:T)=>id!==null&&has(id)?id:fallback;
 return {
  schemaVersion:1,
  profiles:[...profiles.values()],
  runs:[...new Set(order)].map(id=>runs.get(id)!).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
  activeProfileId:keep(mine.activeProfileId,id=>profiles.has(id),theirs.activeProfileId),
  activeRunId:keep(mine.activeRunId,id=>runs.has(id),theirs.activeRunId)
 };
}

/** Shared content only: active selections are per tab and never force a write. */
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?
 Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical((v as Record<string,unknown>)[k])])):v;
const byId=<T extends {id:string}>(xs:T[])=>[...xs].sort((a,b)=>a.id.localeCompare(b.id));
const content=(s:LocalState)=>JSON.stringify(canonical({profiles:byId(s.profiles),runs:byId(s.runs)}));
/** Equal records and selections, regardless of key order in the serialized objects. */
export const sameState=(a:LocalState,b:LocalState)=>
 a.activeProfileId===b.activeProfileId&&a.activeRunId===b.activeRunId&&content(a)===content(b);

/**
 * Handles another tab's save. `adopt` is the state this tab should switch to, if any.
 * `writeBack` is true when storage now lacks something this tab holds, e.g. a stale
 * tab saved over a newer journal; this tab must then save the union.
 */
export function reconcile(mine:LocalState,theirs:LocalState):{adopt:LocalState|null;writeBack:LocalState|null}{
 const merged=mergeStates(mine,theirs);
 return {
  adopt:sameState(merged,mine)?null:merged,
  writeBack:content(merged)===content(theirs)?null:merged
 };
}
