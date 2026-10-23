import {describe,it,expect} from 'vitest';
import {wrongInfoUrl} from './report';

describe('issue report links',()=>{
 it('prefill the wrong-game-information form',()=>{
  const url=new URL(wrongInfoUrl('The Exalted Hordes','It lowers Aether from Fiends (−3).','Wave 4 of 10. Stack: The Puffing Masses'));
  expect(url.pathname).toBe('/RobRoyce/hordemind/issues/new');
  expect(url.searchParams.get('template')).toBe('wrong-game-info.yml');
  expect(url.searchParams.get('item')).toBe('The Exalted Hordes');
  expect(url.searchParams.get('hordemind')).toContain('lowers Aether');
  expect(url.searchParams.get('version')).toMatch(/s15-timeflow.*build 3\.2\.3/);
 });
 it('keep long text short enough for GitHub',()=>{
  expect(wrongInfoUrl('X','a'.repeat(10000),'b'.repeat(10000)).length).toBeLessThan(4000);
 });
});
