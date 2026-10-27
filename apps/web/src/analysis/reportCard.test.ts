import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision,endRun} from '../domain/run';
import type {RunRecord} from '../domain/schema';
import {readRun} from './replay';
import {scoreRun,rangeStats,reportCard,MIN_FAMILY_READINGS,type Scored} from './reportCard';

const A='The Gorging Mass',MYSTERY='Mystery offer';
const span={fromWave:1,toWave:1,chaos:false};
const sc=(actual:number,p:{p10:number;p90:number;mean:number},family:Scored['family']=null):Scored=>({span:{...span,actual},pred:{sd:10,...p},family});
const play=(picks:string[],reads:number[]):RunRecord=>{
 let run=newRun(newProfile('T','Paladin'),picks.length);
 picks.forEach((p,i)=>{run=recordDecision(run,{offered:[p,'x'],chosenIndex:0,observation:i>0?{totalAether:reads[i]!}:null})});
 return endRun(run,'completed',reads.at(-1)!+10);
};

describe('rangeStats',()=>{
 it('range bounds are inclusive and a positive miss means the model predicted too much',()=>{
  const p={p10:80,p90:120,mean:100};
  expect(rangeStats([sc(80,p),sc(120,p),sc(100,p)])).toEqual({readings:3,inRange:3,averageMiss:0});
  expect(rangeStats([sc(80,p)]).averageMiss).toBe(20);
 });
 it('an empty list is all zeros',()=>{
  expect(rangeStats([])).toEqual({readings:0,inRange:0,averageMiss:0});
 });
});

describe('reportCard',()=>{
 const p={p10:80,p90:120,mean:100};
 it('families under 5 readings and unknown offers are left out of the breakdown',()=>{
  const many=Array.from({length:MIN_FAMILY_READINGS},()=>sc(100,p,'Masses'));
  const few=Array.from({length:MIN_FAMILY_READINGS-1},()=>sc(100,p,'Spires'));
  const unknown=Array.from({length:8},()=>sc(100,p,null));
  const card=reportCard([...many,...few,...unknown],null);
  expect(card.byFamily.map(f=>f.family)).toEqual(['Masses']);
  expect(card.buckets.readings).toBe(17);
 });
 it('families sort by reading count, highest first',()=>{
  const a=Array.from({length:5},()=>sc(100,p,'Masses')),b=Array.from({length:7},()=>sc(100,p,'Lords'));
  expect(reportCard([...a,...b],null).byFamily.map(f=>f.family)).toEqual(['Lords','Masses']);
 });
 it('the calibrated row passes through',()=>{
  expect(reportCard([],null).calibrated).toBeNull();
  expect(reportCard([],[sc(80,p)]).calibrated?.readings).toBe(1);
 });
});

describe('scoreRun',()=>{
 it('pairs each scored span with its prediction and the family of the offer taken before it',()=>{
  const r=readRun(play([A,MYSTERY,A],[0,40,90]));
  const preds=r.spans.map((_,i)=>({mean:i,sd:10,p10:0,p90:1}));
  const out=scoreRun(r,preds);
  expect(out.map(s=>s.pred.mean)).toEqual([0,1,2]);
  expect(out.map(s=>s.family)).toEqual(['Masses',null,'Masses']);
 });
 it('finds predictions by span index when some spans are not scored',()=>{
  const r=readRun(play([A,A],[0,40]));
  const only={...r,scored:[r.spans[1]!]};
  const out=scoreRun(only,[{mean:1,sd:10,p10:0,p90:1},{mean:2,sd:10,p10:0,p90:1}]);
  expect(out).toHaveLength(1);
  expect(out[0]!.pred.mean).toBe(2);
 });
});
