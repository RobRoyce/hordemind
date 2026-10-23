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
