import {describe,expect,it} from 'vitest';
import {parseAether,parseCounts} from './reading';

describe('Aether readings',()=>{
 it('reads a whole number',()=>{
  expect(parseAether('85','Aether')).toBe(85);
 });
 it('treats a blank optional reading as no reading',()=>{
  expect(parseAether('  ','Final Aether')).toBeNull();
 });
 it('rejects a blank required reading with its own message',()=>{
  expect(()=>parseAether('','Aether','Enter the Aether total shown after wave 2.')).toThrow('Enter the Aether total shown after wave 2.');
 });
 it('rejects fractions and negatives',()=>{
  expect(()=>parseAether('1.5','Aether')).toThrow('Aether must be a whole number of 0 or more');
  expect(()=>parseAether('-3','Final Aether')).toThrow('Final Aether must be a whole number of 0 or more');
 });
});

describe('event counts',()=>{
 it('keeps counted events and skips blanks, which mean unknown',()=>{
  expect(parseCounts({aetherFiends:'2',hellbornePortals:''})).toEqual({aetherFiends:2});
 });
 it('returns nothing when no event was counted',()=>{
  expect(parseCounts({aetherFiends:' '})).toBeUndefined();
 });
 it('rejects counts that are not whole numbers',()=>{
  expect(()=>parseCounts({aetherFiends:'x'})).toThrow('Event counts must be whole numbers of 0 or more');
 });
});
