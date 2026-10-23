import {CharacterProfileSchema,type CharacterProfile} from './schema';

/** The War Plan node that grants the one-use special offer, as HordeMind models it. */
export const SPECIAL_OFFER_NODE='The Black Pact';

/** Branch alternatives guides describe as mutually exclusive. Prerequisites are not enforced. */
export const EXCLUSIVE_NODES:readonly (readonly [string,string])[]=[
 ['Total Chaos','Reign in Hell'],
 ['Forged in Flame','Flawless Finds']
];

export function toggleWarPlanNode(profile:CharacterProfile,node:string):CharacterProfile{
 const selected=profile.warPlanNodes.includes(node);
 const rivals=EXCLUSIVE_NODES.flatMap(([a,b])=>a===node?[b]:b===node?[a]:[]);
 const warPlanNodes=selected?profile.warPlanNodes.filter(x=>x!==node):[...profile.warPlanNodes.filter(x=>!rivals.includes(x)),node];
 return {...profile,warPlanNodes,specialOfferingAvailable:warPlanNodes.includes(SPECIAL_OFFER_NODE)};
}

/** Accepts bare hosts such as `maxroll.gg/d4/planner/x` by assuming https. */
export function normalizeBuildUrl(text:string):{value:string}|{error:string}{
 const trimmed=text.trim();
 if(!trimmed)return {value:''};
 const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)?trimmed:'https://'+trimmed;
 try{
  const url=new URL(candidate);
  if(url.protocol!=='https:'&&url.protocol!=='http:')return {error:'Use an http(s) link'};
  if(!url.hostname.includes('.'))return {error:'That does not look like a web address'};
  return {value:url.toString()};
 }catch{
  return {error:'That does not look like a web address'};
 }
}

/** Validates a profile before it reaches persisted state. */
export function validateProfile(profile:CharacterProfile):{profile:CharacterProfile}|{error:string}{
 const parsed=CharacterProfileSchema.safeParse({...profile,updatedAt:new Date().toISOString()});
 if(parsed.success)return {profile:parsed.data};
 const issue=parsed.error.issues[0];
 return {error:`${issue?.path.join('.')||'profile'}: ${issue?.message??'invalid value'}`};
}
