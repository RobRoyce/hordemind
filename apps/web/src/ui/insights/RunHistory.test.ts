import {describe,expect,it} from 'vitest';
import {runDate} from './RunHistory';

describe('run history',()=>{
 it('shows the year only for runs from another year',()=>{
  expect(runDate('2024-03-05T12:00:00Z')).toContain('2024');
  const now=new Date();
  expect(runDate(now.toISOString())).not.toContain(String(now.getFullYear()));
 });
});
