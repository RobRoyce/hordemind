import {describe,expect,it} from 'vitest';
import {headlineParts,chaoticLine,choicesLeftOutText,costText,gapText,headline,leftOutText,missCell,needsText,percent,repeatLine,rankedText,varshanLine,offerSetLabel} from './insightsText';

const none={pulse:0,events:0},zero={falling:0,legacy:0,varshanChaos:0};

describe('missCell',()=>{
 it('says about right under 5',()=>{
  expect(missCell(0)).toBe('about right');
  expect(missCell(4.9)).toBe('about right');
  expect(missCell(-4.9)).toBe('about right');
 });
 it('says too much or too little, rounded',()=>{
  expect(missCell(7.6)).toBe('8 too much');
  expect(missCell(5)).toBe('5 too much');
  expect(missCell(-12.4)).toBe('12 too little');
 });
});

describe('needsText',()=>{
 it('pluralizes runs',()=>{
  expect(needsText(1)).toBe('Record 1 more run with at least 3 Aether readings to see the report card.');
  expect(needsText(3)).toBe('Record 3 more runs with at least 3 Aether readings to see the report card.');
 });
});

describe('leftOutText',()=>{
 it('returns null when nothing was left out',()=>expect(leftOutText(none,zero)).toBeNull());
 it('words each part for one and for many',()=>{
  expect(leftOutText({pulse:1,events:0},zero)).toBe("1 run was left out because Pulse of Aether (below Reign in Hell in the Infernal Hordes War Plan) or an upgrade on the tree's right side (Cult of Annihilation and the two after it) adds Aether the model can't place yet.");
  expect(leftOutText({pulse:1,events:2},zero)).toContain("3 runs were left out");
  expect(leftOutText(none,{...zero,falling:1})).toBe('1 reading was skipped because the total went down.');
  expect(leftOutText(none,{...zero,legacy:4})).toBe('4 readings were skipped because they came from an older app version.');
  expect(leftOutText(none,{...zero,varshanChaos:1})).toBe("1 Chaos Wave reading was skipped because Varshan's Vengeance (Lair Bosses War Plan) can change them.");
  expect(leftOutText(none,{...zero,varshanChaos:2})).toContain('2 Chaos Wave readings were skipped');
 });
 it('joins several parts with spaces',()=>{
  const t=leftOutText({pulse:1,events:0},{falling:2,legacy:0,varshanChaos:0})!;
  expect(t).toMatch(/place yet\. 2 readings were skipped because the total went down\.$/);
 });
});

describe('percent',()=>{
 it('rounds to a whole percent',()=>{
  expect(percent(1,3)).toBe('33%');
  expect(percent(2,3)).toBe('67%');
  expect(percent(30,30)).toBe('100%');
 });
 it('returns 0% for an empty total',()=>expect(percent(0,0)).toBe('0%'));
});

describe('headline',()=>{
 it('states the in-range share against the 80% target',()=>
  expect(headline(24,30)).toBe('Your gain landed inside the 80% range in 80% of 30 readings (target 80%).'));
 it('splits out the percentage so it can be styled',()=>{
  const p=headlineParts(24,30);
  expect(p.percent).toBe('80%');
  expect(`${p.before}${p.percent}${p.after}`).toBe(headline(24,30));
 });
});

describe('costText',()=>{
 const cost=(total:number,priced:number)=>({total,average:total/priced,priced});
 it('words a cost and a gain when every pick was priced',()=>{
  expect(costText(cost(41.6,2),2)).toBe('The model estimates your other picks cost about 42 Aether in all, about 21 per pick.');
  expect(costText(cost(-20.2,2),2)).toBe('The model estimates your other picks came out about 20 Aether ahead in all, about 10 per pick.');
 });
 it('says how many picks it could price when some were not',()=>{
  expect(costText(cost(41.6,2),3)).toBe('The model could price 2 of your 3 other picks. Those cost about 42 Aether in all, about 21 per pick.');
  expect(costText(cost(-20.2,2),3)).toBe('The model could price 2 of your 3 other picks. Those came out about 20 Aether ahead in all, about 10 per pick.');
 });
});

describe('gapText',()=>{
 it('words the gap against the all-readings figure',()=>{
  expect(gapText(6.4,null)).toBe('After those picks your gain came in 6 above its forecast per reading.');
  expect(gapText(-6.4,null)).toBe('After those picks your gain came in 6 below its forecast per reading.');
  expect(gapText(2,null)).toBe('After those picks your gain came in about level with its forecast.');
  expect(gapText(6.4,-12.4)).toBe('After those picks your gain came in 6 above its forecast per reading, against 12 below across all your readings.');
  expect(gapText(-6.4,12.4)).toBe('After those picks your gain came in 6 below its forecast per reading, against 12 above across all your readings.');
  expect(gapText(-6.4,3)).toBe('After those picks your gain came in 6 below its forecast per reading, against about level across all your readings.');
  expect(gapText(-2,-9.6)).toBe('After those picks your gain came in about level with its forecast, against 10 below across all your readings.');
 });
});

describe('rankedText',()=>{
 it('leads with the given line and lists offers with counts',()=>
  expect(rankedText('Offers you took most often over the recommendation',[{offer:'A',count:3},{offer:'B',count:1}])).toBe('Offers you took most often over the recommendation: A (3), B (1).'));
 it('words the passed-on line',()=>
  expect(rankedText('Recommendations you passed on most often',[{offer:'A',count:2}])).toBe('Recommendations you passed on most often: A (2).'));
});

describe('choicesLeftOutText',()=>{
 it('is null when nothing was left out',()=>expect(choicesLeftOutText(0,0)).toBeNull());
 it('words each part for one and for many',()=>{
  expect(choicesLeftOutText(1,0)).toBe('1 choice was recorded without a recommendation showing, so it is skipped.');
  expect(choicesLeftOutText(3,0)).toBe('3 choices were recorded without a recommendation showing, so they are skipped.');
  expect(choicesLeftOutText(0,1)).toBe("The forecast comparison leaves out 1 run the report card can't score.");
  expect(choicesLeftOutText(0,2)).toBe("The forecast comparison leaves out 2 runs the report card can't score.");
 });
 it('joins both parts',()=>expect(choicesLeftOutText(2,1)).toBe(
  "2 choices were recorded without a recommendation showing, so they are skipped. The forecast comparison leaves out 1 run the report card can't score."));
});

const R=(hits:number,total:number)=>({hits,total});
const V=(median:number|null,count:number)=>({median,count});
const CHAOS='The Chaotic Offering, the Chaos Wave offer, appeared in ';
const REP="Offers shared your previous pick's family in ";

describe('chaoticLine',()=>{
 it('compares both sides',()=>expect(chaoticLine(R(5,20),R(9,12),0)).toBe(
  CHAOS+'25% of 20 offer sets without Total Chaos and 75% of 12 with it. Total Chaos is in the row below Method and Madness, on the right, in the Infernal Hordes War Plan.'));
 it('words a single set',()=>expect(chaoticLine(R(1,1),R(0,1),0)).toBe(
  CHAOS+'100% of 1 offer set without Total Chaos and 0% of 1 with it. Total Chaos is in the row below Method and Madness, on the right, in the Infernal Hordes War Plan.'));
 it('words a side with no data',()=>{
  expect(chaoticLine(R(5,20),R(0,0),0)).toBe(CHAOS+'25% of 20 offer sets, all without Total Chaos (row below Method and Madness, on the right, in the Infernal Hordes War Plan).');
  expect(chaoticLine(R(0,0),R(9,12),0)).toBe(CHAOS+'75% of 12 offer sets, all with Total Chaos (row below Method and Madness, on the right, in the Infernal Hordes War Plan).');
  expect(chaoticLine(R(1,1),R(0,0),0)).toBe(CHAOS+'100% of 1 offer set, all without Total Chaos (row below Method and Madness, on the right, in the Infernal Hordes War Plan).');
 });
 it('is null with no sets',()=>expect(chaoticLine(R(0,0),R(0,0),0)).toBeNull());
 it('notes that Reign in Hell runs are left out',()=>{
  const note=' Runs with Reign in Hell, in the same row, are left out, because it suppresses Chaos Waves.';
  expect(chaoticLine(R(5,20),R(9,12),3)).toBe(CHAOS+'25% of 20 offer sets without Total Chaos and 75% of 12 with it. Total Chaos is in the row below Method and Madness, on the right, in the Infernal Hordes War Plan.'+note);
  expect(chaoticLine(R(5,20),R(0,0),1)).toBe(CHAOS+'25% of 20 offer sets, all without Total Chaos (row below Method and Madness, on the right, in the Infernal Hordes War Plan).'+note);
  expect(chaoticLine(R(0,0),R(9,12),1)).toBe(CHAOS+'75% of 12 offer sets, all with Total Chaos (row below Method and Madness, on the right, in the Infernal Hordes War Plan).'+note);
 });
 it('says so when every run had Reign in Hell',()=>{
  expect(chaoticLine(R(0,0),R(0,0),4)).toBe('The Chaotic Offering rate leaves out all 4 offer sets, because every run had Reign in Hell (row below Method and Madness, on the left, in the Infernal Hordes War Plan), which suppresses Chaos Waves.');
  expect(chaoticLine(R(0,0),R(0,0),1)).toBe('The Chaotic Offering rate leaves out all 1 offer set, because every run had Reign in Hell (row below Method and Madness, on the left, in the Infernal Hordes War Plan), which suppresses Chaos Waves.');
 });
});

describe('repeatLine',()=>{
 it('compares both sides with sample sizes',()=>expect(repeatLine(R(3,4),R(1,4))).toBe(
  REP+'75% of 4 sets with Method and Madness, the node directly below the top node in the Infernal Hordes War Plan, and 25% of 4 without it.'));
 it('words a single set',()=>expect(repeatLine(R(1,1),R(1,2))).toBe(
  REP+'100% of 1 set with Method and Madness, the node directly below the top node in the Infernal Hordes War Plan, and 50% of 2 without it.'));
 it('words a side with no data',()=>{
  expect(repeatLine(R(3,4),R(0,0))).toBe(REP+'75% of 4 sets, all with Method and Madness (node directly below the top node in the Infernal Hordes War Plan).');
  expect(repeatLine(R(0,0),R(1,4))).toBe(REP+'25% of 4 sets, all without Method and Madness (node directly below the top node in the Infernal Hordes War Plan).');
  expect(repeatLine(R(0,0),R(1,1))).toBe(REP+'100% of 1 set, all without Method and Madness (node directly below the top node in the Infernal Hordes War Plan).');
 });
 it('is null with no sets',()=>expect(repeatLine(R(0,0),R(0,0))).toBeNull());
});

describe('varshanLine',()=>{
 const where="Varshan's Vengeance is next to the top node of the Lair Bosses War Plan.";
 it('compares both sides',()=>expect(varshanLine(V(310,4),V(280.4,1))).toBe(
  `Chaos Waves paid a median 310 Aether with Varshan's Vengeance (4 waves) and 280 without it (1 wave). ${where}`));
 it('words a side with no data',()=>{
  expect(varshanLine(V(310.6,4),V(null,0))).toBe("Chaos Waves paid a median 311 Aether over 4 waves, all with Varshan's Vengeance (next to the top node of the Lair Bosses War Plan).");
  expect(varshanLine(V(null,0),V(280,1))).toBe("Chaos Waves paid a median 280 Aether over 1 wave, all without Varshan's Vengeance (next to the top node of the Lair Bosses War Plan).");
 });
 it('is null with no waves',()=>expect(varshanLine(V(null,0),V(null,0))).toBeNull());
});

describe('offerSetLabel',()=>{
 it('names each setup with its set count',()=>{
  expect(offerSetLabel('reign',1)).toBe('With Reign in Hell (1 offer set)');
  expect(offerSetLabel('chaos',12)).toBe('With Total Chaos (12 offer sets)');
  expect(offerSetLabel('neither',3)).toBe('With neither Reign in Hell nor Total Chaos (3 offer sets)');
 });
});
