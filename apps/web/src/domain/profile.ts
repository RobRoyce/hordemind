import {CharacterProfileSchema,type CharacterProfile} from './schema';
import {SPECIAL_OFFER_NODE,toggleNode} from './warplan';

export {SPECIAL_OFFER_NODE};

/** Learns or unlearns a War Plan node as the game allows; The Black Pact drives the special offer. */
export function toggleWarPlanNode(profile:CharacterProfile,node:string):CharacterProfile{
 const warPlanNodes=toggleNode(profile.warPlanNodes,node);
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
