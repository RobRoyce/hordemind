import {describe,expect,it} from 'vitest';
import {headlineParts,chaoticLine,costText,gapText,headline,leftOutText,missText,needsText,percent,repeatLine,rankedText,varshanLine,familyLine} from './insightsText';

const none={pulse:0,events:0},zero={falling:0,legacy:0,varshanChaos:0};

describe('missText',()=>{
 it('calls small misses about right',()=>{
  expect(missText(0)).toBe('about right on average');
  expect(missText(4.9)).toBe('about right on average');
  expect(missText(-4.9)).toBe('about right on average');
 });
 it('says too much for a positive miss and too little for a negative one',()=>{
  expect(missText(7.6)).toBe('predicts 8 too much per reading');
  expect(missText(5)).toBe('predicts 5 too much per reading');
  expect(missText(-12.4)).toBe('predicts 12 too little per reading');
 });
});

describe('needsText',()=>{
 it('pluralizes runs',()=>{
  expect(needsText(1)).toBe('Record 1 more run with Aether readings to see the report card.');
  expect(needsText(3)).toBe('Record 3 more runs with Aether readings to see the report card.');
 });
});

describe('leftOutText',()=>{
 it('returns null when nothing was left out',()=>expect(leftOutText(none,zero)).toBeNull());
 it('words each part for one and for many',()=>{
  expect(leftOutText({pulse:1,events:0},zero)).toBe("1 run was left out because Pulse of Aether (offers branch, third row) or the events branch adds Aether the model can't place yet.");
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

describe('familyLine',()=>{
 it('names the family, count and miss',()=>
  expect(familyLine('Masses',12,-9.2)).toBe('After Masses offers (12 readings): predicts 9 too little per reading'));
});

describe('choices text',()=>{
 it('prices a cost, and words a negative one as a gain',()=>{
  expect(costText(41.6)).toBe('The model estimates your other picks cost about 42 Aether.');
  expect(costText(-20.2)).toBe('The model estimates your other picks came out about 20 Aether ahead.');
 });
 it('words the forecast gap by sign',()=>{
  expect(gapText(6.4)).toBe('After those picks you beat its forecast by 6 per reading.');
  expect(gapText(-6.4)).toBe('After those picks you fell short of its forecast by 6 per reading.');
 });
 it('lists the most taken offers',()=>
  expect(rankedText([{offer:'A',count:3},{offer:'B',count:1}])).toBe('Most taken over the recommendation: A (3), B (1)'));
});

const R=(hits:number,total:number)=>({hits,total});
const V=(median:number|null,count:number)=>({median,count});
const CHAOS='The Chaotic Offering, the Chaos Wave offer, appeared in ';
const REP="Offers shared your previous pick's family in ";

describe('chaoticLine',()=>{
 it('compares both sides',()=>expect(chaoticLine(R(5,20),R(9,12))).toBe(
  CHAOS+'25% of 20 offer sets without Total Chaos and 75% of 12 with it. Total Chaos is in the second row of the offers branch.'));
 it('words a single set',()=>expect(chaoticLine(R(1,1),R(0,1))).toBe(
  CHAOS+'100% of 1 offer set without Total Chaos and 0% of 1 with it. Total Chaos is in the second row of the offers branch.'));
 it('words a side with no data',()=>{
  expect(chaoticLine(R(5,20),R(0,0))).toBe(CHAOS+'25% of 20 offer sets, all without Total Chaos (second row of the offers branch).');
  expect(chaoticLine(R(0,0),R(9,12))).toBe(CHAOS+'75% of 12 offer sets, all with Total Chaos (second row of the offers branch).');
  expect(chaoticLine(R(1,1),R(0,0))).toBe(CHAOS+'100% of 1 offer set, all without Total Chaos (second row of the offers branch).');
 });
 it('is null with no sets',()=>expect(chaoticLine(R(0,0),R(0,0))).toBeNull());
});

describe('repeatLine',()=>{
 it('compares both sides with sample sizes',()=>expect(repeatLine(R(3,4),R(1,4))).toBe(
  REP+'75% of 4 sets with Method and Madness, the first node of the offers branch, and 25% of 4 without it.'));
 it('words a single set',()=>expect(repeatLine(R(1,1),R(1,2))).toBe(
  REP+'100% of 1 set with Method and Madness, the first node of the offers branch, and 50% of 2 without it.'));
 it('words a side with no data',()=>{
  expect(repeatLine(R(3,4),R(0,0))).toBe(REP+'75% of 4 sets, all with Method and Madness (first node of the offers branch).');
  expect(repeatLine(R(0,0),R(1,4))).toBe(REP+'25% of 4 sets, all without Method and Madness (first node of the offers branch).');
  expect(repeatLine(R(0,0),R(1,1))).toBe(REP+'100% of 1 set, all without Method and Madness (first node of the offers branch).');
 });
 it('is null with no sets',()=>expect(repeatLine(R(0,0),R(0,0))).toBeNull());
});

describe('varshanLine',()=>{
 const where="Varshan's Vengeance is next to the root of the Lair Bosses War Plan.";
 it('compares both sides',()=>expect(varshanLine(V(310,4),V(280.4,1))).toBe(
  `Chaos Waves paid a median 310 Aether with Varshan's Vengeance (4 waves) and 280 without it (1 wave). ${where}`));
 it('words a side with no data',()=>{
  expect(varshanLine(V(310.6,4),V(null,0))).toBe("Chaos Waves paid a median 311 Aether over 4 waves, all with Varshan's Vengeance (next to the root of the Lair Bosses War Plan).");
  expect(varshanLine(V(null,0),V(280,1))).toBe("Chaos Waves paid a median 280 Aether over 1 wave, all without Varshan's Vengeance (next to the root of the Lair Bosses War Plan).");
 });
 it('is null with no waves',()=>expect(varshanLine(V(null,0),V(null,0))).toBeNull());
});
