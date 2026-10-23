import {EventSchema,type RunEvent,type RunRecord,type CharacterProfile} from './schema';

export const CLIENT_VERSION='v2-core.2';
const now=()=>new Date().toISOString();

export function newProfile(name:string,className:CharacterProfile['className']):CharacterProfile{
 return {id:crypto.randomUUID(),name,className,realm:'Season 15',buildName:'',buildUrl:'',difficulty:'Unknown',gamePatch:'S15-unverified',warPlanNodes:[],specialOfferingAvailable:false,killSpeed:'unknown',mobility:'unknown',provenance:'manual',updatedAt:now()};
}
export function newRun(profile:CharacterProfile,totalWaves:number):RunRecord{
 const record:RunRecord={id:crypto.randomUUID(),createdAt:now(),status:'in_progress',researchConsent:false,events:[]};
 return append(record,'run_started',{profile:structuredClone(profile),totalWaves,gamePatch:profile.gamePatch});
}

type EventOf<T extends RunEvent['type']>=Extract<RunEvent,{type:T}>;
type PayloadOf<T extends RunEvent['type']>=EventOf<T>['payload'];
const ofType=<T extends RunEvent['type']>(events:RunEvent[],type:T)=>events.filter((e):e is EventOf<T>=>e.type===type);

export function append<T extends RunEvent['type']>(run:RunRecord,type:T,payload:PayloadOf<T>):RunRecord {
 if(run.status!=='in_progress' && type!=='correction')throw new Error('Run already ended');
 const candidate=EventSchema.parse({id:crypto.randomUUID(),runId:run.id,sequence:run.events.length,schemaVersion:1,clientVersion:CLIENT_VERSION,at:now(),type,payload}) as RunEvent;
 if(candidate.type!=='run_started'&&candidate.type!=='correction')validate(run,candidate);
 return {...run,events:[...run.events,candidate],status:candidate.type==='run_finished'?candidate.payload.outcome:run.status};
}

function validate(run:RunRecord,candidate:RunEvent){
 const events=effectiveEvents(run),p=project(run);
 const cumulative=(total:number|null)=>{
  if(total!==null&&p.lastTotalAether!==null&&total<p.lastTotalAether)throw new Error(`Cumulative Aether cannot decrease (last reading ${p.lastTotalAether})`);
 };
 switch(candidate.type){
  case 'offers_presented':{
   if(events.some(x=>x.type==='offers_presented'&&x.payload.wave===candidate.payload.wave))throw new Error('Choices already recorded for this wave; correct or undo first');
   if(p.decisionsComplete)throw new Error(`All ${p.totalWaves} wave decisions are already recorded`);
   if(candidate.payload.wave!==p.nextWave)throw new Error(`The next offer precedes wave ${p.nextWave}`);
   break;
  }
  case 'offer_chosen':{
   const source=ofType(events,'offers_presented').filter(x=>x.payload.wave===candidate.payload.wave).at(-1);
   if(!source||source.payload.offered[candidate.payload.chosenIndex]!==candidate.payload.chosen)throw new Error('Chosen offer must match the recorded slot');
   if(candidate.payload.usedSpecial!==(source.payload.specialSlotIndex!==undefined&&source.payload.specialSlotIndex===candidate.payload.chosenIndex))throw new Error('Special-choice flag must match the chosen slot');
   if(events.some(x=>x.type==='offer_chosen'&&x.payload.wave===candidate.payload.wave))throw new Error('Wave choice already recorded');
   if(source.payload.specialSlotIndex!==undefined&&!p.profile.specialOfferingAvailable)throw new Error('The character profile has no special offering configured');
   if(source.payload.specialSlotIndex!==undefined&&!p.specialRemaining)throw new Error('One-time special offering has already been used');
   break;
  }
  case 'aether_observed':{
   if(candidate.payload.afterWave>p.wavesPlayedAtNextStep)throw new Error(p.wavesPlayedAtNextStep===0?'No Aether can be observed before wave 1 is played':`Wave ${candidate.payload.afterWave} has not been played yet`);
   if(ofType(events,'aether_observed').some(x=>x.payload.afterWave===candidate.payload.afterWave))throw new Error(`Aether after wave ${candidate.payload.afterWave} is already recorded`);
   cumulative(candidate.payload.totalAether);
   break;
  }
  case 'wave_observed':cumulative(candidate.payload.totalAether);break;
  case 'run_finished':{
   if(candidate.payload.outcome==='completed'&&!p.decisionsComplete)throw new Error('A completed run needs a decision for every wave; end it as abandoned instead');
   cumulative(candidate.payload.finalAether);
   break;
  }
 }
}

export function effectiveEvents(run:RunRecord):RunEvent[]{
 const suppressed=new Set<string>();
 for(const event of run.events){if(event.type==='correction')event.payload.targetEventIds.forEach(id=>suppressed.add(id))}
 return run.events.filter(e=>e.type!=='correction'&&!suppressed.has(e.id));
}

export interface RunProjection {
 totalWaves:number;
 /** The wave the next offer precedes. */
 nextWave:number;
 decisionsComplete:boolean;
 /** Waves finished by the time of the next decision or, once decisions are complete, the run's end. */
 wavesPlayedAtNextStep:number;
 profile:CharacterProfile;
 chosen:EventOf<'offer_chosen'>[];
 lastTotalAether:number|null;
 /** Wave whose end the latest reading measured; null for legacy readings of unknown timing. */
 lastObservedWave:number|null;
 lastOffered:string[];
 specialRemaining:boolean;
}
export function project(run:RunRecord):RunProjection{
 const events=effectiveEvents(run);
 const started=ofType(events,'run_started')[0];
 if(!started)throw new Error('Run start event missing');
 const totalWaves=started.payload.totalWaves;
 const chosen=ofType(events,'offer_chosen');
 const reading=events.filter(e=>
  (e.type==='aether_observed'||e.type==='wave_observed')&&e.payload.totalAether!==null||
  e.type==='run_finished'&&e.payload.finalAether!==null).at(-1);
 const lastTotalAether=reading?.type==='run_finished'?reading.payload.finalAether:reading?.type==='aether_observed'||reading?.type==='wave_observed'?reading.payload.totalAether:null;
 const lastObservedWave=reading?.type==='aether_observed'?reading.payload.afterWave:reading?.type==='run_finished'&&reading.payload.outcome==='completed'?totalWaves:null;
 return {
  totalWaves,
  nextWave:Math.min(totalWaves+1,chosen.length+1),
  decisionsComplete:chosen.length>=totalWaves,
  wavesPlayedAtNextStep:Math.min(totalWaves,chosen.length),
  profile:started.payload.profile,
  chosen,
  lastTotalAether,
  lastObservedWave,
  lastOffered:ofType(events,'offers_presented').at(-1)?.payload.offered??[],
  specialRemaining:started.payload.profile.specialOfferingAvailable&&!chosen.some(x=>x.payload.usedSpecial)
 };
}

export interface Observation{totalAether:number|null;eventCounts?:Record<string,number>}
export interface DecisionInput{
 offered:string[];chosenIndex:number;specialSlotIndex?:number|null;
 observation?:Observation|null;recommendedOffer?:string|null;modelVersion?:string|null;
}
const observed=(o:Observation|null|undefined):o is Observation=>Boolean(o&&(o.totalAether!==null||Object.keys(o.eventCounts??{}).length));

/** Records one wave's decision, plus the Aether reading taken on the same offer screen. All or nothing. */
export function recordDecision(run:RunRecord,input:DecisionInput):RunRecord{
 if(run.status!=='in_progress')throw new Error('Run already ended');
 const p=project(run);
 if(p.decisionsComplete)throw new Error(`All ${p.totalWaves} wave decisions are already recorded`);
 const {offered,chosenIndex}=input,special=input.specialSlotIndex??null;
 if(!Number.isInteger(chosenIndex)||chosenIndex<0||chosenIndex>=offered.length)throw new Error('Choose a valid offer slot');
 if(special!==null&&(!Number.isInteger(special)||special<0||special>=offered.length))throw new Error('Invalid special slot');
 let next=run;
 if(observed(input.observation)){
  if(p.wavesPlayedAtNextStep===0)throw new Error('No Aether can be observed before wave 1 is played');
  const {totalAether,eventCounts}=input.observation;
  next=append(next,'aether_observed',{afterWave:p.wavesPlayedAtNextStep,totalAether,...(eventCounts&&Object.keys(eventCounts).length?{eventCounts}:{})});
 }
 next=append(next,'offers_presented',{wave:p.nextWave,offered,...(special!==null?{specialSlotIndex:special}:{})});
 const chosen=offered[chosenIndex]??'',recommended=input.recommendedOffer??null;
 return append(next,'offer_chosen',{wave:p.nextWave,chosen,chosenIndex,usedSpecial:chosenIndex===special,
  followedRecommendation:recommended===null?null:recommended===chosen,recommendedOffer:recommended,modelVersion:input.modelVersion??null});
}

export function endRun(run:RunRecord,outcome:'completed'|'abandoned',finalAether:number|null):RunRecord{
 return append(run,'run_finished',{outcome,finalAether});
}

/** Events of the last decision: its offer set, choice, and the reading entered with it. */
function lastDecision(run:RunRecord){
 const events=effectiveEvents(run),chosen=ofType(events,'offer_chosen');
 const selected=chosen.at(-1);
 if(!selected)return null;
 const previous=chosen.at(-2)?.sequence??-1,wave=selected.payload.wave;
 const presented=ofType(events,'offers_presented').filter(x=>x.payload.wave===wave).at(-1);
 const reading=ofType(events,'aether_observed').find(x=>x.payload.afterWave===wave-1&&x.sequence>previous&&x.sequence<selected.sequence);
 const legacy=ofType(events,'wave_observed').filter(x=>x.payload.wave===wave);
 return {selected,presented,reading,legacy};
}

export interface DecisionDraft{offered:string[];chosenIndex:number;specialSlotIndex:number|null;observation:Observation|null}
export function decisionDraft(run:RunRecord):DecisionDraft|null{
 const last=lastDecision(run);
 if(!last?.presented)return null;
 const {payload}=last.presented,reading=last.reading?.payload;
 return {offered:[...payload.offered],chosenIndex:last.selected.payload.chosenIndex,specialSlotIndex:payload.specialSlotIndex??null,
  observation:reading?{totalAether:reading.totalAether,...(reading.eventCounts?{eventCounts:{...reading.eventCounts}}:{})}:null};
}

export function undoChoice(run:RunRecord):RunRecord {
 const last=lastDecision(run);
 if(!last)return run;
 const targets=[last.selected,last.presented,last.reading,...last.legacy].flatMap(x=>x?[x.id]:[]);
 return append(run,'correction',{targetEventIds:targets,explanation:'User corrected last recorded choice'});
}
