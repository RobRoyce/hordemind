import {describe,expect,it} from 'vitest';
import {viewFromHash} from './route';

describe('routes',()=>{
 it('opens Character from the old Strategy Lab hash',()=>expect(viewFromHash('#strategy')).toBe('character'));
 it('opens Character from its own hash',()=>expect(viewFromHash('#character')).toBe('character'));
 it('keeps the run and insights hashes',()=>{
  expect(viewFromHash('#run')).toBe('run');
  expect(viewFromHash('#insights')).toBe('insights');
 });
 it('falls back to the run',()=>{
  expect(viewFromHash('#nope')).toBe('run');
  expect(viewFromHash('')).toBe('run');
 });
});
