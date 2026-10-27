import {describe,expect,it} from 'vitest';
import {chaoticLine,costText,gapText,headline,leftOutText,missText,needsText,percent,repeatLine,rankedText,varshanLine,familyLine} from './insightsText';

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

describe('game number lines',()=>{
 it('describes The Chaotic Offering rates',()=>{
  expect(chaoticLine({hits:5,total:20},{hits:9,total:12})).toBe(
   'The Chaotic Offering, the Chaos Wave offer, appeared in 25% of 20 offer sets without Total Chaos and 75% of 12 with it. Total Chaos is in the second row of the offers branch.');
  expect(chaoticLine({hits:0,total:0},{hits:0,total:0})).toBeNull();
 });
 it('describes repeats with Method and Madness',()=>{
  expect(repeatLine({hits:3,total:4},{hits:1,total:4})).toBe(
   "Offers shared your previous pick's family in 75% of sets with Method and Madness, the first node of the offers branch, and 25% without it.");
  expect(repeatLine({hits:0,total:0},{hits:0,total:0})).toBeNull();
 });
 it('describes Chaos Wave pay with and without Varshan',()=>{
  expect(varshanLine({median:310,count:4},{median:280.4,count:1})).toBe(
   "Chaos Waves paid a median 310 with Varshan's Vengeance (4 waves) and 280 without it (1 wave).");
  expect(varshanLine({median:null,count:0},{median:null,count:0})).toBeNull();
 });
});
