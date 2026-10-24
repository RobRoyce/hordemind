import {describe,expect,it} from 'vitest';
import {emptyBreakdown} from '../../recommendation/simulate';
import type {Comparison,Estimate,SensitivityResult} from '../../recommendation/model';
import {robustnessLine} from './robustness';

function estimate(offer:string,mean:number,sensitivity:SensitivityResult[]=[]):Estimate{
 return {offer,modeled:true,mean,low:mean-10,high:mean+10,components:emptyBreakdown(),reasons:[],assumptions:[],sensitivity,synergies:[]};
}
function comparison(robust:boolean|null,assessments:Estimate[]):Comparison{
 return {assessments,recommended:assessments[0]?.offer??null,conditional:false,samples:400,modelVersion:'test',warnings:[],robust,pact:null};
}

describe('robustnessLine',()=>{
 it('says the pick holds when it wins under every assumption',()=>{
  expect(robustnessLine(comparison(true,[estimate('A',100),estimate('B',50)]))).toBe('Holds under every timing assumption tested.');
 });
 it('says nothing when robustness was not checked',()=>{
  expect(robustnessLine(comparison(null,[estimate('A',100),estimate('B',50)]))).toBeNull();
 });
 it('names the first assumption under which another offer wins',()=>{
  const a=estimate('A',100,[{name:'Events are 30% quicker',mean:120},{name:'Events take 40% longer',mean:60}]);
  const b=estimate('B',90,[{name:'Events are 30% quicker',mean:110},{name:'Events take 40% longer',mean:80}]);
  expect(robustnessLine(comparison(false,[a,b]))).toBe('B is best if events take 40% longer.');
 });
 it('falls back to a general close call when no listed assumption flips the pick',()=>{
  const a=estimate('A',100,[{name:'Events take 40% longer',mean:90}]);
  const b=estimate('B',90,[{name:'Events take 40% longer',mean:70}]);
  expect(robustnessLine(comparison(false,[a,b]))).toBe('Close call: the best offer changes under other timing assumptions.');
 });
});
