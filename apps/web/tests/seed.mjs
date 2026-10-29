// Builds stored app state by hand so plain Node (e2e.mjs) can seed recorded runs.

const CLIENT_VERSION='v2-core.2';
const STAMP=Date.UTC(2026,9,1);
const A='The Teeming Masses',B='The Bursting Masses',C='The Hungry Spires';

const slowRun=(shift)=>({
 offers:Array.from({length:10},(_,i)=>[[A,B],[B,C],[C,A]][(i+shift)%3]),
 chosen:Array(10).fill(0),
 totals:Array.from({length:10},(_,i)=>25*(i+1)),
 final:250
});

/** A fast, mobile character with no War Plan nodes and three completed 10-wave runs. */
export const SLOW_RUNS={runs:[slowRun(0),slowRun(1),slowRun(2)]};

const profileOf=(over)=>({
 id:crypto.randomUUID(),name:'Seeded',className:'Paladin',realm:'Season 15',buildName:'',buildUrl:'',difficulty:'Unknown',
 gamePatch:'S15-unverified',warPlanNodes:[],activeSplinter:null,splinterRanks:{terror:null,destruction:null,hatred:null},
 lairBossNodes:[],specialOfferingAvailable:false,killSpeed:'fast',mobility:'high',provenance:'manual',
 updatedAt:new Date(STAMP).toISOString(),...over
});

function runOf(profile,spec,n){
 const id=crypto.randomUUID(),waves=spec.offers.length;
 let seq=0;
 const events=[];
 const push=(type,payload)=>events.push({id:crypto.randomUUID(),runId:id,schemaVersion:1,sequence:seq++,clientVersion:CLIENT_VERSION,at:new Date(STAMP+n*3600000+seq*1000).toISOString(),type,payload});
 push('run_started',{profile:structuredClone(profile),totalWaves:waves,gamePatch:profile.gamePatch});
 const inProgress=spec.status==='in_progress';
 spec.offers.forEach((offered,i)=>{
  const wave=i+1;
  push('offers_presented',{wave,offered});
  const pick=spec.chosen[i]??0;
  push('offer_chosen',{wave,chosen:offered[pick],chosenIndex:pick,usedSpecial:false,followedRecommendation:null,recommendedOffer:null,modelVersion:null,choiceSource:null});
  if(wave<waves&&spec.totals[i]!==undefined)push('aether_observed',{afterWave:wave,totalAether:spec.totals[i]});
 });
 if(!inProgress)push('run_finished',{finalAether:spec.final,outcome:'completed'});
 return {id,createdAt:new Date(STAMP+n*3600000).toISOString(),status:inProgress?'in_progress':'completed',researchConsent:false,events};
}

/** Returns a full LocalState holding one profile and the spec's runs. */
export function seededState(spec){
 const profile=profileOf(spec.profile);
 const runs=spec.runs.map((r,n)=>runOf(profile,r,n));
 return {schemaVersion:1,profiles:[profile],activeProfileId:profile.id,activeRunId:null,runs};
}
