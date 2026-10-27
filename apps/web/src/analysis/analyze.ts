import type {RunRecord} from '../domain/schema';
import {readRun,replaySpans,type RunReadings} from './replay';
import {scoreRun,reportCard,type ReportCard,type Scored} from './reportCard';
import {overrideSummary,type OverrideSummary,type Price} from './overrides';
import {offerGap} from '../recommendation/model';
import {gameCounts,type GameCounts} from './counts';

export const REPORT_SAMPLES=150;
export const MIN_RUNS=3;
export const MIN_READINGS=3;

/** A run counts toward the report card when it is comparable and has enough readings, finished or not. */
export const qualifies=(r:RunReadings)=>r.leftOut===null&&r.scored.length>=MIN_READINGS;

export interface CharacterAnalysis{
 profileId:string;qualifying:number;needed:number;report:ReportCard|null;
 leftOut:{pulse:number;events:number};
 skipped:{falling:number;legacy:number;varshanChaos:number};
 overrides:OverrideSummary;
}
export interface Analysis{character:CharacterAnalysis|null;counts:GameCounts}

interface RunEntry{samples:number;r:RunReadings;scored:Scored[]|null}
/** Remembers per-run replays and override prices between calls; results never differ from an uncached call. */
export interface AnalysisCache{runs:Map<string,RunEntry>;gaps:Map<string,Map<string,number|null>>}
export const newAnalysisCache=():AnalysisCache=>({runs:new Map(),gaps:new Map()});
const runKey=(run:RunRecord)=>`${run.id}:${run.events.length}`;
/** Drops entries for runs absent from `runs`, and earlier versions of runs that grew. */
export function pruneAnalysisCache(cache:AnalysisCache,runs:readonly RunRecord[]){
 const keys=new Set(runs.map(runKey)),ids=new Set(runs.map(r=>r.id));
 for(const k of cache.runs.keys())if(!keys.has(k))cache.runs.delete(k);
 for(const id of cache.gaps.keys())if(!ids.has(id))cache.gaps.delete(id);
}

const profileIdOf=(run:RunRecord)=>{
 const e=run.events.find(x=>x.type==='run_started');
 return e&&e.type==='run_started'?e.payload.profile.id:null;
};

/** Scores one character's runs against the model and pools offer counts across all characters. */
export function analyze(runs:readonly RunRecord[],profileId:string|null,samples=REPORT_SAMPLES,cache?:AnalysisCache):Analysis{
 const counts=gameCounts(runs);
 if(!profileId)return {character:null,counts};
 const mine=runs.filter(r=>profileIdOf(r)===profileId);
 const leftOut={pulse:0,events:0},skipped={falling:0,legacy:0,varshanChaos:0};
 const buckets:Scored[]=[];
 let qualifying=0;
 const inputs=mine.map(run=>{
  const key=runKey(run);
  let entry=cache?.runs.get(key);
  if(!entry||entry.samples!==samples){
   const r=readRun(run);
   entry={samples,r,scored:qualifies(r)?scoreRun(r,replaySpans(r,samples)):null};
   cache?.runs.set(key,entry);
  }
  const {r,scored}=entry;
  skipped.falling+=r.skipped.falling;skipped.legacy+=r.skipped.legacy;skipped.varshanChaos+=r.skipped.varshanChaos;
  if(r.leftOut)leftOut[r.leftOut]++;
  if(!scored)return {run,scored:null};
  qualifying++;
  buckets.push(...scored);
  return {run,scored};
 });
 const price:Price|undefined=cache&&((sc,a,b,n,runId)=>{
  const key=JSON.stringify([sc.history,sc.totalWaves,sc.decisionWave,sc.profile,a,b,n]);
  let gaps=cache.gaps.get(runId);
  if(!gaps)cache.gaps.set(runId,gaps=new Map());
  if(!gaps.has(key))gaps.set(key,offerGap(sc,a,b,n));
  return gaps.get(key)!;
 });
 return {character:{
  profileId,qualifying,needed:Math.max(0,MIN_RUNS-qualifying),
  report:qualifying>=MIN_RUNS?reportCard(buckets,null):null,
  leftOut,skipped,overrides:overrideSummary(inputs,samples,price)
 },counts};
}

/** Drops an analysis computed for a different character. */
export const analysisFor=(profileId:string|null,a:Analysis|null):Analysis|null=>
 a&&(a.character?.profileId??null)!==profileId?null:a;
