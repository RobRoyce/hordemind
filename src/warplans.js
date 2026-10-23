// Season 15 Infernal Hordes War Plan reference.
// Names/branch alternatives checked against current community guides.
// Do not assign unverified effects to the Monte Carlo simulation.
export const access = {
 location:"Temis, Skovos → War Plans table → Infernal Hordes activity tree",
 unlock:"Finish Lord of Hatred campaign once; complete the War Plans introduction.",
 allocation:"Level the Infernal Hordes activity tree by running it within a War Plan. Spend its activity points on connected nodes.",
 reroll:"Marks of Eldruin reroll War Plan activities; this is separate from reallocating activity-tree points.",
 source:"https://consolepulse.com/multiplatform/diablo/guides/diablo-4-season-15-war-plans-guide"
};
export const nodes=[
 {name:"Method and Madness",branch:"Offer control",description:"Weights offering choices toward the category of the previous pick.",impact:"Changes future offering probabilities; no quantified distribution available.",status:"modeled as a note"},
 {name:"The Black Pact",branch:"Offer control",description:"Offers another choice related to a previously selected category; community reports suggest it may repeat a prior offering.",impact:"May create an additional mid-run selection opportunity; exact trigger, frequency and eligibility remain unverified.",status:"tracked, not valued"},
 {name:"Reign in Hell",branch:"Strategy lock",description:"Suppresses Chaos Waves in favor of a more consistent offering strategy.",impact:"Avoids random Chaos opportunities, a genuine strategic tradeoff.",status:"tracked, not valued"},
 {name:"Pulse of Aether",branch:"Strategy lock",description:"Rewards Aether for suppressing Chaos Surges.",impact:"A community guide reports +50 Aether per suppressed Chaos Surge.",status:"provisional"},
 {name:"Total Chaos",branch:"Chaos focus",description:"Increases Chaos Wave frequency at the expense of one normal offering choice.",impact:"Changes future chance of Chaos and size of the choice set.",status:"tracked, not valued"},
 {name:"Bedlam",branch:"Chaos focus",description:"Rewards Aether upon entering Chaos Surges.",impact:"A community guide reports +50 Aether per Chaos Surge entered.",status:"provisional"},
 {name:"Impending Doom",branch:"Wave events",description:"Provides additional Doom-related wave effects.",impact:"With Splinter of Terror and reputation rank 14, also triggers at 30 seconds remaining.",status:"tracked"},
 {name:"Cult of Annihilation",branch:"Wave events",description:"A Doom-related wave modifier.",impact:"With Splinter of Terror and reputation rank 5, a Doomsayer appears at each wave start.",status:"tracked"},
 {name:"Exalted Council",branch:"End boss and spoils",description:"Increases the difficulty and loot of the final boss encounter.",impact:"Affects rewards, not necessarily wave Aether.",status:"not an Aether coefficient"},
 {name:"Council Coffers",branch:"End boss and spoils",description:"Unlocks an additional Chest of Talismans.",impact:"With Splinter of Terror at rank 20, its cost becomes 1 Aether.",status:"tracked"},
 {name:"Infernal Hoard",branch:"End boss and spoils",description:"Additional premium gear hoard after Council or Bartuc.",impact:"Changes loot value rather than expected wave Aether.",status:"tracked"},
 {name:"Forged in Flame",branch:"Materials",description:"Receive Obducite rather than gem fragments.",impact:"Useful for masterworking.",status:"tracked"},
 {name:"Flawless Finds",branch:"Materials",description:"Alternative materials path focused on gems.",impact:"Choose based on desired rewards, not Aether.",status:"tracked"}
];
export const groups=["Offer control","Chaos focus","Strategy lock","Wave events","End boss and spoils","Materials"];
export const mutuallyExclusive=[["Total Chaos","Reign in Hell"],["Forged in Flame","Flawless Finds"]];
export function warAdvice(selected=[]){
 const set=new Set(selected),a=[];
 if(set.has("Total Chaos")&&set.has("Reign in Hell"))a.push("Total Chaos and Reign in Hell are competing approaches; check your active branch.");
 if(set.has("The Black Pact"))a.push("The Black Pact's future option value is not yet simulated. Saving its special choice can be beneficial.");
 if(set.has("Total Chaos"))a.push("Total Chaos trades an ordinary option for extra Chaos opportunities. Good for fast-clearing builds that handle random events.");
 if(set.has("Reign in Hell"))a.push("Reign in Hell favors a consistent stack (e.g., Mass or Hellborne) instead of random Chaos Waves.");
 if(set.has("Council Coffers"))a.push("Council Coffers can be particularly useful for Charm/Seal hunting; with Splinter of Terror rank 20 its chest costs 1 Aether.");
 return a;
}
