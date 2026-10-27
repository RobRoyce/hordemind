import type {Rate} from '../../analysis/counts';

const n=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;

/** A mean miss under 5 Aether reads as no bias. */
export function missText(averageMiss:number):string{
 if(Math.abs(averageMiss)<5)return 'about right on average';
 const amount=Math.round(Math.abs(averageMiss));
 return `predicts ${amount} too ${averageMiss>0?'much':'little'} per reading`;
}

/** Average miss as a plain phrase for a table cell; under 5 Aether reads as no bias. */
export function missCell(miss:number):string{
 if(Math.abs(miss)<5)return 'about right';
 return `${Math.round(Math.abs(miss))} too ${miss>0?'much':'little'}`;
}

export const needsText=(needed:number)=>`Record ${needed} more ${needed===1?'run':'runs'} with at least 3 Aether readings to see the report card.`;

export function leftOutText(leftOut:{pulse:number;events:number},skipped:{falling:number;legacy:number;varshanChaos:number}):string|null{
 const runs=leftOut.pulse+leftOut.events;
 const parts=[
  runs&&`${n(runs,'run was','runs were')} left out because Pulse of Aether (third row of the offers branch in the Infernal Hordes War Plan) or the events branch adds Aether the model can't place yet.`,
  skipped.falling&&`${n(skipped.falling,'reading was','readings were')} skipped because the total went down.`,
  skipped.legacy&&`${n(skipped.legacy,'reading was','readings were')} skipped because they came from an older app version.`,
  skipped.varshanChaos&&`${n(skipped.varshanChaos,'Chaos Wave reading was','Chaos Wave readings were')} skipped because Varshan's Vengeance (Lair Bosses War Plan) can change them.`
 ].filter(Boolean);
 return parts.length?parts.join(' '):null;
}

export const percent=(hits:number,total:number)=>`${total?Math.round(100*hits/total):0}%`;

export const headlineParts=(inRange:number,readings:number)=>
 ({before:'Your gain landed inside the 80% range in ',percent:percent(inRange,readings),after:` of ${readings} readings (target 80%).`});

export const headline=(inRange:number,readings:number)=>{
 const p=headlineParts(inRange,readings);
 return `${p.before}${p.percent}${p.after}`;
};

export const familyLine=(family:string,readings:number,averageMiss:number)=>
 `After ${family} offers (${readings} readings): ${missText(averageMiss)}`;

const round=Math.round;

/** A positive total is Aether the recommendation would have gained over the picks you made. */
export function costText(cost:{total:number;average:number;priced:number},tookOther:number):string{
 const t=round(Math.abs(cost.total)),av=round(Math.abs(cost.average)),gain=cost.total>=0;
 if(cost.priced===tookOther)return gain
  ?`The model estimates your other picks cost about ${t} Aether in all, about ${av} per pick.`
  :`The model estimates your other picks came out about ${t} Aether ahead in all, about ${av} per pick.`;
 return `The model could price ${cost.priced} of your ${tookOther} other picks. `+(gain
  ?`Those cost about ${t} Aether in all, about ${av} per pick.`
  :`Those came out about ${t} Aether ahead in all, about ${av} per pick.`);
}

/** `gap` is actual minus forecast after your overrides; `all` is the same across every reading, or null with no report. */
export function gapText(gap:number,all:number|null):string{
 const side=(x:number)=>x>0?'above':'below';
 const open=Math.abs(gap)<5?'After those picks your gain came in about level with its forecast'
  :`After those picks your gain came in ${round(Math.abs(gap))} ${side(gap)} its forecast per reading`;
 if(all===null)return `${open}.`;
 return Math.abs(all)<5?`${open}, against about level across all your readings.`
  :`${open}, against ${round(Math.abs(all))} ${side(all)} across all your readings.`;
}

export const rankedText=(lead:string,ranked:readonly {offer:string;count:number}[])=>
 `${lead}: ${ranked.map(r=>`${r.offer} (${r.count})`).join(', ')}.`;

/** Notes on choices the Your choices numbers leave out. */
export function choicesLeftOutText(skippedOlder:number,gapLeftOut:number):string|null{
 const parts=[
  skippedOlder&&`${skippedOlder} older ${skippedOlder===1?'choice was':'choices were'} recorded before HordeMind saved its recommendation, so ${skippedOlder===1?'it is':'they are'} skipped.`,
  gapLeftOut&&`The forecast comparison leaves out ${n(gapLeftOut,'run','runs')} the report card can't score.`
 ].filter(Boolean);
 return parts.length?parts.join(' '):null;
}

const CHAOS='The Chaotic Offering, the Chaos Wave offer, appeared in ';
const WAR_PLAN='in the Infernal Hordes War Plan';
const TC=`second row of the offers branch ${WAR_PLAN}`;
const REIGN_NOTE=' Runs with Reign in Hell are left out, because it suppresses Chaos Waves.';
export function chaoticLine(without:Rate,withTotalChaos:Rate,reignSets:number):string|null{
 const w=`${percent(without.hits,without.total)} of ${n(without.total,'offer set','offer sets')}`;
 const c=`${percent(withTotalChaos.hits,withTotalChaos.total)} of ${n(withTotalChaos.total,'offer set','offer sets')}`;
 const note=reignSets>0?REIGN_NOTE:'';
 if(without.total&&withTotalChaos.total)return `${CHAOS}${w} without Total Chaos and ${percent(withTotalChaos.hits,withTotalChaos.total)} of ${withTotalChaos.total} with it. Total Chaos is in the ${TC}.${note}`;
 if(without.total)return `${CHAOS}${w}, all without Total Chaos (${TC}).${note}`;
 if(withTotalChaos.total)return `${CHAOS}${c}, all with Total Chaos (${TC}).${note}`;
 if(reignSets>0)return `The Chaotic Offering rate leaves out all ${n(reignSets,'offer set','offer sets')}, because every run had Reign in Hell (${TC}), which suppresses Chaos Waves.`;
 return null;
}

const REPEAT="Offers shared your previous pick's family in ";
const MM=`first node of the offers branch ${WAR_PLAN}`;
export function repeatLine(withMadness:Rate,without:Rate):string|null{
 const w=`${percent(withMadness.hits,withMadness.total)} of ${n(withMadness.total,'set','sets')}`;
 const o=`${percent(without.hits,without.total)} of ${n(without.total,'set','sets')}`;
 if(withMadness.total&&without.total)return `${REPEAT}${w} with Method and Madness, the ${MM}, and ${percent(without.hits,without.total)} of ${without.total} without it.`;
 if(withMadness.total)return `${REPEAT}${w}, all with Method and Madness (${MM}).`;
 if(without.total)return `${REPEAT}${o}, all without Method and Madness (${MM}).`;
 return null;
}

const WHERE='next to the root of the Lair Bosses War Plan';
const median=(m:number|null)=>m===null?0:Math.round(m);
export function varshanLine(withV:{median:number|null;count:number},without:{median:number|null;count:number}):string|null{
 const V="Varshan's Vengeance";
 if(withV.count&&without.count)return `Chaos Waves paid a median ${median(withV.median)} Aether with ${V} (${n(withV.count,'wave','waves')}) and ${median(without.median)} without it (${n(without.count,'wave','waves')}). ${V} is ${WHERE}.`;
 if(withV.count)return `Chaos Waves paid a median ${median(withV.median)} Aether over ${n(withV.count,'wave','waves')}, all with ${V} (${WHERE}).`;
 if(without.count)return `Chaos Waves paid a median ${median(without.median)} Aether over ${n(without.count,'wave','waves')}, all without ${V} (${WHERE}).`;
 return null;
}

const SETUP_LABEL={reign:'With Reign in Hell',chaos:'With Total Chaos',neither:'With neither Reign in Hell nor Total Chaos'};
export const offerSetLabel=(setup:keyof typeof SETUP_LABEL,sets:number)=>`${SETUP_LABEL[setup]} (${n(sets,'offer set','offer sets')})`;
