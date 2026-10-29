import {describe,expect,it} from 'vitest';
import {niceMax} from './scale';

describe('niceMax',()=>{
 it('rounds up to a tidy axis end',()=>{
  expect(niceMax(76)).toEqual({max:80,step:20});
  expect(niceMax(36)).toEqual({max:40,step:10});
  expect(niceMax(101)).toEqual({max:150,step:50});
 });
 it('floors small and negative values at 10',()=>{
  expect(niceMax(0)).toEqual({max:10,step:5});
  expect(niceMax(-3)).toEqual({max:10,step:5});
 });
});
