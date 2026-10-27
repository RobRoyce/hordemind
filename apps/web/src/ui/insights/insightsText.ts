import type {Rate} from '../../analysis/counts';

const n=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;

/** A mean miss under 5 Aether reads as no bias. */
export function missText(averageMiss:number):string{
 if(Math.abs(averageMiss)<5)return 'about right on average';
 const amount=Math.round(Math.abs(averageMiss));
 return `predicts ${amount} too ${averageMiss>0?'much':'little'} per reading`;
}

export const needsText=(needed:number)=>`Record ${n(needed,'more run','more runs')} with Aether readings to see the report card.`;

export function leftOutText(leftOut:{pulse:number;events:number},skipped:{falling:number;legacy:number;varshanChaos:number}):string|null{
 const runs=leftOut.pulse+leftOut.events;
 const parts=[
  runs&&`${n(runs,'run was','runs were')} left out because Pulse of Aether (offers branch, third row) or the events branch adds Aether the model can't place yet.`,
  skipped.falling&&`${n(skipped.falling,'reading was','readings were')} skipped because the total went down.`,
  skipped.legacy&&`${n(skipped.legacy,'reading was','readings were')} skipped because they came from an older app version.`,
  skipped.varshanChaos&&`${n(skipped.varshanChaos,'Chaos Wave reading was','Chaos Wave readings were')} skipped because Varshan's Vengeance (Lair Bosses War Plan) can change them.`
 ].filter(Boolean);
 return parts.length?parts.join(' '):null;
}

export const percent=(hits:number,total:number)=>`${total?Math.round(100*hits/total):0}%`;

export const headline=(inRange:number,readings:number)=>
 `Your gain landed inside the 80% range in ${percent(inRange,readings)} of ${readings} readings (target 80%).`;

export const familyLine=(family:string,readings:number,averageMiss:number)=>
 `After ${family} offers (${readings} readings): ${missText(averageMiss)}`;

/** A positive total is Aether the recommendation would have gained over the picks you made. */
export const costText=(total:number)=>total>=0
 ?`The model estimates your other picks cost about ${Math.round(total)} Aether.`
 :`The model estimates your other picks came out about ${Math.round(-total)} Aether ahead.`;

export const gapText=(average:number)=>
 `After those picks you ${average>=0?'beat':'fell short of'} its forecast by ${Math.round(Math.abs(average))} per reading.`;

export const rankedText=(ranked:readonly {offer:string;count:number}[])=>
 `Most taken over the recommendation: ${ranked.map(r=>`${r.offer} (${r.count})`).join(', ')}`;

export const chaoticLine=(without:Rate,withTotalChaos:Rate):string|null=>without.total+withTotalChaos.total===0?null:
 `The Chaotic Offering, the Chaos Wave offer, appeared in ${percent(without.hits,without.total)} of ${n(without.total,'offer set','offer sets')} without Total Chaos and ${percent(withTotalChaos.hits,withTotalChaos.total)} of ${withTotalChaos.total} with it. Total Chaos is in the second row of the offers branch.`;

export const repeatLine=(withMadness:Rate,without:Rate):string|null=>withMadness.total+without.total===0?null:
 `Offers shared your previous pick's family in ${percent(withMadness.hits,withMadness.total)} of sets with Method and Madness, the first node of the offers branch, and ${percent(without.hits,without.total)} without it.`;

const median=(m:number|null)=>m===null?'n/a':String(Math.round(m));
export const varshanLine=(withV:{median:number|null;count:number},without:{median:number|null;count:number}):string|null=>withV.count+without.count===0?null:
 `Chaos Waves paid a median ${median(withV.median)} with Varshan's Vengeance (${n(withV.count,'wave','waves')}) and ${median(without.median)} without it (${n(without.count,'wave','waves')}).`;
