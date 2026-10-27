import {describe,expect,it} from 'vitest';
import {SPLINTERS} from '../../domain/splinters';
import {bonusState,chooseSplinter,parseRank} from './splinterView';

const bonus=(node:string)=>SPLINTERS.flatMap(x=>x.bonuses).find(b=>b.node===node)!;
const rank=(splinterRank:number|null,extra:{warPlanNodes?:string[];lairBossNodes?:string[]}={})=>({splinterRank,warPlanNodes:[],lairBossNodes:[],...extra});

describe('splinter view',()=>{
 it('Impending Doom is active once learned and unlearned before',()=>{
  expect(bonusState(rank(14,{warPlanNodes:['Impending Doom']}),bonus('Impending Doom'))).toBe('active');
  expect(bonusState(rank(14),bonus('Impending Doom'))).toBe('unlearned');
 });
 it('Council Coffers is active without rewards nodes',()=>{
  expect(bonusState(rank(20),bonus('Council Coffers'))).toBe('active');
 });
 it('Exotic Armory is unlearned until it is in Lair Bosses',()=>{
  expect(bonusState(rank(20),bonus('Exotic Armory'))).toBe('unlearned');
  expect(bonusState(rank(20,{lairBossNodes:['Exotic Armory']}),bonus('Exotic Armory'))).toBe('active');
 });
 it('a bonus above the rank is locked',()=>{
  expect(bonusState(rank(10),bonus('Impending Doom'))).toBe('locked');
  expect(bonusState(rank(null),bonus('Impending Doom'))).toBe('locked');
 });
 it('choosing a splinter keeps the rank only for the same splinter',()=>{
  expect(chooseSplinter({activeSplinter:'terror',splinterRank:14},'terror')).toEqual({activeSplinter:'terror',splinterRank:14});
  expect(chooseSplinter({activeSplinter:'terror',splinterRank:14},'hatred')).toEqual({activeSplinter:'hatred',splinterRank:null});
  expect(chooseSplinter({activeSplinter:null,splinterRank:5},'terror')).toEqual({activeSplinter:'terror',splinterRank:null});
 });
 it('rank input clamps to 0-24 and treats empty as not set',()=>{
  expect(parseRank('')).toBeNull();
  expect(parseRank('30')).toBe(24);
  expect(parseRank('-2')).toBe(0);
  expect(parseRank('abc')).toBeUndefined();
 });
});
