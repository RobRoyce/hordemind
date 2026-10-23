import {EventSchema,type RunEvent,type RunRecord,type CharacterProfile} from './schema';

export const CLIENT_VERSION='v2-foundation.1';
const now=()=>new Date().toISOString();
export function newProfile(name:string,className:CharacterProfile['className']):CharacterProfile{
 return {id:crypto.randomUUID(),name,className,realm:'Season 15',buildName:'',buildUrl:'',difficulty:'Unknown',gamePatch:'S15-unverified',warPlanNodes:[],specialOfferingAvailable:false,killSpeed:'unknown',mobility:'unknown',provenance:'manual',updatedAt:now()};
}
export function newRun(profile:CharacterProfile,totalWaves:number):RunRecord{
 const record:RunRecord={id:crypto.randomUUID(),createdAt:now(),status:'in_progress',researchConsent:false,events:[]};
 return append(record,'run_started',{profile:structuredClone(profile),totalWaves,gamePatch:profile.gamePatch});
}
type PayloadOf<T extends RunEvent['type']>=Extract<RunEvent,{type:T}>['payload'];
export function append<T extends RunEvent['type']>(run:RunRecord,type:T,payload:PayloadOf<T>):RunRecord {
 if(run.status!=='in_progress' && type!=='correction')throw new Error('Run already ended');
 const candidate=EventSchema.parse({id:crypto.randomUUID(),runId:run.id,sequence:run.events.length,schemaVersion:1,clientVersion:CLIENT_VERSION,at:now(),type,payload}) as RunEvent;
 const events=effectiveEvents(run);
 if(candidate.type==='offer_chosen'){
  const source=events.filter(x=>x.type==='offers_presented'&&x.payload.wave===candidate.payload.wave).at(-1);
  if(!source || source.type!=='offers_presented'||source.payload.offered[candidate.payload.chosenIndex]!==candidate.payload.chosen)throw new Error('Chosen offer must match the recorded slot');
  if(candidate.payload.usedSpecial!==(source.payload.specialSlotIndex===candidate.payload.chosenIndex&&source.payload.specialSlotIndex!==undefined))throw new Error('Special-choice flag must match the chosen slot');
  if(events.some(x=>x.type==='offer_chosen'&&x.payload.wave===candidate.payload.wave))throw new Error('Wave choice already recorded');
  if(candidate.payload.usedSpecial && events.some(x=>x.type==='offer_chosen'&&x.payload.usedSpecial))throw new Error('One-time special offering has already been used');
  if(candidate.payload.usedSpecial){const started=events.find(x=>x.type==='run_started');if(started?.type!=='run_started'||!started.payload.profile.specialOfferingAvailable)throw new Error('The character profile has no special offering configured');}
 }
 if(candidate.type==='wave_observed'){
  const previous=events.filter(x=>x.type==='wave_observed'&&x.payload.totalAether!==null).at(-1);
  if(candidate.payload.totalAether!==null&&previous&&previous.type==='wave_observed'&&candidate.payload.totalAether<Number(previous.payload.totalAether))throw new Error('Cumulative Aether cannot decrease');
 }
 if(candidate.type==='offers_presented'){
  const pending=events.filter(x=>x.type==='offer_chosen').at(-1);
  if(pending?.type==='offer_chosen'&&!events.some(x=>x.type==='wave_observed'&&x.payload.wave===pending.payload.wave))throw new Error('Complete or skip the last wave observation before continuing');
  if(events.some(x=>x.type==='offers_presented'&&x.payload.wave===candidate.payload.wave))throw new Error('Choices already recorded for this wave; correct or undo first');
 }
 return {...run,events:[...run.events,candidate],status:candidate.type==='run_finished'?candidate.payload.outcome:run.status};
}
export function effectiveEvents(run:RunRecord):RunEvent[]{
 const suppressed=new Set<string>();
 for(const event of run.events){if(event.type==='correction')event.payload.targetEventIds.forEach(id=>suppressed.add(id))}
 return run.events.filter(e=>e.type!=='correction'&&!suppressed.has(e.id));
}
export interface RunProjection {
 totalWaves:number;nextWave:number;profile:CharacterProfile;chosen:Extract<RunEvent,{type:'offer_chosen'}>[];
 lastTotalAether:number|null;lastOffered:string[];specialRemaining:boolean;awaitingObservation:boolean;
}
export function project(run:RunRecord):RunProjection{
 const events=effectiveEvents(run);
 const started=events.find(e=>e.type==='run_started');
 if(!started||started.type!=='run_started')throw new Error('Run start event missing');
 const chosen=events.filter((e):e is Extract<RunEvent,{type:'offer_chosen'}>=>e.type==='offer_chosen');
 const observations=events.filter((e):e is Extract<RunEvent,{type:'wave_observed'}>=>e.type==='wave_observed');
 const lastOffered=events.filter((e):e is Extract<RunEvent,{type:'offers_presented'}>=>e.type==='offers_presented').at(-1)?.payload.offered??[];
 const after=chosen.at(-1);
 const awaitingObservation=Boolean(after&&!observations.some(e=>e.payload.wave===after.payload.wave));
 return {totalWaves:started.payload.totalWaves,nextWave:Math.min(started.payload.totalWaves+1,chosen.length+1),
 profile:started.payload.profile,chosen,lastTotalAether:observations.filter(x=>x.payload.totalAether!==null).at(-1)?.payload.totalAether??null,
 lastOffered,specialRemaining:started.payload.profile.specialOfferingAvailable&&!chosen.some(x=>x.payload.usedSpecial),awaitingObservation};
}
export function undoChoice(run:RunRecord):RunRecord {
 const events=effectiveEvents(run),selected=events.filter(x=>x.type==='offer_chosen').at(-1);
 if(!selected)return run;
 const associated=events.filter(x=>x.type==='offers_presented'&&x.payload.wave===selected.payload.wave||x.type==='wave_observed'&&x.payload.wave===selected.payload.wave);
 return append(run,'correction',{targetEventIds:[selected.id,...associated.map(x=>x.id)],explanation:'User corrected last recorded choice'});
}
export function recordDecision(run:RunRecord,offered:string[],chosenIndex:number,specialSlotIndex:number|null=null):RunRecord{
 const p=project(run);
 if(!Number.isInteger(chosenIndex)||chosenIndex<0||chosenIndex>=offered.length)throw Error('Choose a valid offer slot');
 if(specialSlotIndex!==null&&(!Number.isInteger(specialSlotIndex)||specialSlotIndex<0||specialSlotIndex>=offered.length))throw Error('Invalid special slot');
 let next=append(run,'offers_presented',{wave:p.nextWave,offered,...(specialSlotIndex!==null?{specialSlotIndex}:{})});
 next=append(next,'offer_chosen',{wave:p.nextWave,chosen:offered[chosenIndex]??'',chosenIndex,usedSpecial:chosenIndex===specialSlotIndex,followedRecommendation:null,modelVersion:null});
 return next;
}
