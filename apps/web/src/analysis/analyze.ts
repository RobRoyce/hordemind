import type {RunRecord} from '../domain/schema';
import {readRun,replaySpans,type RunReadings} from './replay';
import {scoreRun,reportCard,type ReportCard,type Scored} from './reportCard';
import {overrideSummary,type OverrideSummary} from './overrides';
import {gameCounts,type GameCounts} from './counts';

export const REPORT_SAMPLES=150;
export const MIN_RUNS=3;
export const MIN_READINGS=3;

/** A run counts toward the report card when it is finished enough and its Aether is comparable. */
export const qualifies=(r:RunReadings)=>r.leftOut===null&&r.scored.length>=MIN_READINGS&&r.status!=='in_progress';

export interface CharacterAnalysis{
 profileId:string;qualifying:number;needed:number;report:ReportCard|null;
 leftOut:{pulse:number;events:number};
 skipped:{falling:number;legacy:number;varshanChaos:number};
 overrides:OverrideSummary;
}
export interface Analysis{character:CharacterAnalysis|null;counts:GameCounts}

const profileIdOf=(run:RunRecord)=>{
 const e=run.events.find(x=>x.type==='run_started');
 return e&&e.type==='run_started'?e.payload.profile.id:null;
};

/** Scores one character's runs against the model and pools offer counts across all characters. */
export function analyze(runs:readonly RunRecord[],profileId:string|null,samples=REPORT_SAMPLES):Analysis{
 const counts=gameCounts(runs);
 if(!profileId)return {character:null,counts};
 const mine=runs.filter(r=>profileIdOf(r)===profileId);
 const leftOut={pulse:0,events:0},skipped={falling:0,legacy:0,varshanChaos:0};
 const buckets:Scored[]=[];
 let qualifying=0;
 const inputs=mine.map(run=>{
  const r=readRun(run);
  skipped.falling+=r.skipped.falling;skipped.legacy+=r.skipped.legacy;skipped.varshanChaos+=r.skipped.varshanChaos;
  if(r.leftOut)leftOut[r.leftOut]++;
  if(!qualifies(r))return {run,scored:null};
  qualifying++;
  const scored=scoreRun(r,replaySpans(r,samples));
  buckets.push(...scored);
  return {run,scored};
 });
 return {character:{
  profileId,qualifying,needed:Math.max(0,MIN_RUNS-qualifying),
  report:qualifying>=MIN_RUNS?reportCard(buckets,null):null,
  leftOut,skipped,overrides:overrideSummary(inputs,samples)
 },counts};
}

/** Drops an analysis computed for a different character. */
export const analysisFor=(profileId:string|null,a:Analysis|null):Analysis|null=>
 a&&a.character&&a.character.profileId!==profileId?null:a;
