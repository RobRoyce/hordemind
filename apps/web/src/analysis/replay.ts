import type {CharacterProfile,RunRecord} from '../domain/schema';
import {effectiveEvents} from '../domain/run';
import {playerProfile} from '../recommendation/scenario';
import {resolveOffer} from '../catalog';
import {simulateWaveDetailed,hash,BASELINE,type Assumptions,type PlayerProfile} from '../recommendation/simulate';
import type {EventKind} from '../recommendation/mechanics';

/** Aether earned over waves fromWave..toWave, measured by two readings. */
export interface Span{fromWave:number;toWave:number;actual:number;chaos:boolean}
export interface ReplayWave{wave:number;stack:string[];chaos:boolean;newPickIndex:number}
/** Why a run's Aether cannot be compared: its War Plan changes Aether in ways the model skips. */
export type LeftOut='pulse'|'events';
export interface RunReadings{
 runId:string;profileId:string;difficulty:CharacterProfile['difficulty'];createdAt:string;status:RunRecord['status'];totalWaves:number;
 profile:PlayerProfile;lairBossNodes:string[];waves:ReplayWave[];spans:Span[];scored:Span[];
 skipped:{falling:number;legacy:number;varshanChaos:number};leftOut:LeftOut|null;
}

const EVENT_BRANCH_NODES=['Cult of Annihilation','Scale of Tathamet',"Devil's Deal"];
const VARSHAN="Varshan's Vengeance";

/** Reads a run's picks and Aether totals into spans between consecutive readings. */
export function readRun(run:RunRecord):RunReadings{
 const events=effectiveEvents(run);
 const started=events.find(e=>e.type==='run_started');
 if(!started||started.type!=='run_started')throw new Error('Run start event missing');
 const {profile:snap,totalWaves}=started.payload;
 const picks=events.flatMap(e=>e.type==='offer_chosen'?[e]:[]).sort((a,b)=>a.payload.wave-b.payload.wave).map(e=>e.payload.chosen);
 const chaosAt=(wave:number)=>{const p=picks[wave-1];return p!==undefined&&resolveOffer(p)?.family==='Chaos'};
 const raw:{wave:number;total:number|null}[]=[];
 let legacy=0;
 for(const e of events){
  if(e.type==='aether_observed')raw.push({wave:e.payload.afterWave,total:e.payload.totalAether});
  else if(e.type==='wave_observed')legacy++;
  // an abandoned run's final total has no known wave, so it is not a reading
  else if(e.type==='run_finished'&&e.payload.outcome==='completed')raw.push({wave:totalWaves,total:e.payload.finalAether});
 }
 raw.sort((a,b)=>a.wave-b.wave);
 const lairBossNodes=[...snap.lairBossNodes];
 const spans:Span[]=[];
 let falling=0,prevWave=0,prevTotal=0;
 for(const {wave,total} of raw){
  if(total===null||wave<=prevWave)continue;
  if(total<prevTotal){falling++;continue}
  let chaos=false;
  for(let w=prevWave+1;w<=wave;w++)chaos||=chaosAt(w);
  spans.push({fromWave:prevWave+1,toWave:wave,actual:total-prevTotal,chaos});
  prevWave=wave;prevTotal=total;
 }
 const last=spans.at(-1)?.toWave??0;
 const waves:ReplayWave[]=[];
 for(let w=1;w<=last;w++)waves.push({wave:w,stack:picks.slice(0,w),chaos:chaosAt(w),newPickIndex:w-1});
 const scored=lairBossNodes.includes(VARSHAN)?spans.filter(s=>!s.chaos):spans;
 const nodes=snap.warPlanNodes;
 const leftOut:LeftOut|null=nodes.some(n=>EVENT_BRANCH_NODES.includes(n))?'events':nodes.includes('Pulse of Aether')?'pulse':null;
 return {runId:run.id,profileId:snap.id,difficulty:snap.difficulty,createdAt:run.createdAt,status:run.status,totalWaves,profile:playerProfile(snap),lairBossNodes,waves,spans,scored,
  skipped:{falling,legacy,varshanChaos:spans.length-scored.length},leftOut};
}

export interface SpanPrediction{mean:number;sd:number;p10:number;p90:number}
/** Smallest spread reported, so a few lucky samples never claim certainty. */
export const SD_FLOOR=10;

/** FNV-1a, 32 bit. */
export function seedOf(id:string):number{
 let h=0x811c9dc5;
 for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,0x01000193)}
 return h>>>0;
}

/**
 * Simulated Aether per span; one pass replays every wave with that wave's recorded stack.
 * Council Aether is paid on defeating the Fell Council, so it joins only a completed run's final span.
 */
export function replaySpans(r:RunReadings,samples:number,profile:PlayerProfile=r.profile,assumptions:Assumptions=BASELINE):SpanPrediction[]{
 const totals=r.spans.map(()=>new Array<number>(samples).fill(0));
 const spanOf=(wave:number)=>r.spans.findIndex(s=>s.fromWave<=wave&&wave<=s.toWave);
 for(let i=0;i<samples;i++){
  const seed=hash(seedOf(r.runId)+i*9733);
  let carry:EventKind[]=[],council=0;
  for(const w of r.waves){
   const {out,leftover}=simulateWaveDetailed({index:0,stack:w.stack,genericPicks:0,chaos:w.chaos,newPickIndex:w.newPickIndex},
    profile,hash(seed+Math.imul(w.wave,0x9e3779b1)),assumptions,carry);
   carry=leftover;
   const k=spanOf(w.wave);
   council+=out.Council;
   if(k>=0)totals[k]![i]!+=Object.values(out).reduce((a,v)=>a+v,0)-out.Council;
  }
  if(r.status==='completed'&&r.spans.at(-1)?.toWave===r.totalWaves)totals[r.spans.length-1]![i]!+=council;
 }
 return totals.map(t=>{
  const n=t.length,mean=n?t.reduce((a,v)=>a+v,0)/n:0;
  const sampleSd=n>1?Math.sqrt(t.reduce((a,v)=>a+(v-mean)**2,0)/(n-1)):0;
  const sorted=[...t].sort((a,b)=>a-b);
  return {mean,sd:Math.max(SD_FLOOR,sampleSd),p10:sorted[Math.floor(0.1*(n-1))]??0,p90:sorted[Math.ceil(0.9*(n-1))]??0};
 });
}
