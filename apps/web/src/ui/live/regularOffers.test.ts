import {describe,expect,it} from 'vitest';
import {regularOffers} from './LiveRun';

describe('offer rows a wave starts with',()=>{
 it('starts with three',()=>{
  expect(regularOffers([])).toBe(3);
 });
 it('keeps four for Reign in Hell, which adds an offer',()=>{
  expect(regularOffers(['Method and Madness','Reign in Hell'])).toBe(4);
 });
 it('keeps three for Total Chaos, leaving a row for the Chaotic Offering',()=>{
  expect(regularOffers(['Method and Madness','Total Chaos'])).toBe(3);
 });
});
