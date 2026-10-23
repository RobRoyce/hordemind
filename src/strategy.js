import {warAdvice} from "./warplans.js";
export const strategies=[
 {name:"Recurring Masses",tag:"Aether engine",requires:["The Puffing Masses","The Massing Masses","The Bursting Masses"],why:"Bursting adds Masses repeatedly; Massing reforms them; Puffing makes each destruction worth more. The engine benefits from remaining waves and fast Mass clear speed.",risk:"Event time congestion and potential overcounting of Mass respawns."},
 {name:"Mass → Hellborne",tag:"Cross-engine",requires:["The Hellish Masses","The Exalted Hellborne"],why:"Hellish generates Hellborne from Mass kills; Exalted increases the reward per Hellborne kill. Mass proliferation raises trigger opportunities.",risk:"Without a Hellborne spawner, Exalted may have little or no current value."},
 {name:"Dedicated Hellborne",tag:"Monster engine",requires:["The Burning Hellborne","The Summoned Hellborne","The Exalted Hellborne"],why:"Pair spawn sources with payoff modifiers. Selecting rewards without sufficient spawns wastes a slot.",risk:"The exact spawn frequencies are not calibrated."},
 {name:"Chaos farming",tag:"War Plan path",requires:["Chaotic Offering"],why:"Chaos choices have high immediate reward potential when the build handles uncertain encounters.",risk:"Outcome unknown in advance; simulator uses provisional probabilities."}
];
export function analyzeSetup(state){
 const prior=new Set(state.history||[]);const nodes=state.warNodes||[];const notes=[];
 if(prior.has("The Puffing Masses"))notes.push("Puffing already rewards a deeper Mass stack; prioritize effects that increase completed Mass kills, subject to time.");
 if(prior.has("The Hellish Masses")&&!prior.has("The Exalted Hellborne"))notes.push("Hellish Masses provides a Hellborne spawn engine. Look for Exalted Hellborne if Hellborne kills are frequent.");
 if(prior.has("The Exalted Hellborne")&&!["The Hellish Masses","The Summoned Hellborne","The Burning Hellborne"].some(n=>prior.has(n)))notes.push("Exalted Hellborne needs a reliable Hellborne spawner; don't assume baseline Hellborne.");
 if(!prior.size)notes.push("Early waves favor repeatable generators; late waves favor immediate payouts because fewer waves remain.");
 return [...notes,...warAdvice(nodes)];
}
