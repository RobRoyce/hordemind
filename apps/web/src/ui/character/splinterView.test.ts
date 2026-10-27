import {describe,expect,it} from 'vitest';
import {SPLINTERS} from '../../domain/splinters';
import {bonusState,parseRank} from './splinterView';

const bonus=(node:string)=>SPLINTERS.flatMap(x=>x.bonuses).find(b=>b.node===node)!;
const rank=(terror:number|null,extra:{warPlanNodes?:string[];lairBossNodes?:string[]}={})=>({activeSplinter:'terror' as const,splinterRanks:{terror,destruction:null,hatred:null},warPlanNodes:[],lairBossNodes:[],...extra});

describe('splinter view',()=>{
 it('Impending Doom is active once learned and unlearned before',()=>{
  expect(bonusState(rank(14,{warPlanNodes:['Impending Doom']}),bonus('Impending Doom'))).toBe('active');
  expect(bonusState(rank(14),bonus('Impending Doom'))).toBe('unlearned');
 });
 it('Council Coffers is active without rewards nodes',()=>{
  expect(bonusState(rank(20),bonus('Council Coffers'))).toBe('active');
 });
 it('Exotic Armory is unlearned until it is in Lair Bosses',()=>{
  const d=(extra:{lairBossNodes?:string[]}={})=>({activeSplinter:'destruction' as const,splinterRanks:{terror:null,destruction:20,hatred:null},warPlanNodes:[],lairBossNodes:[],...extra});
  expect(bonusState(d(),bonus('Exotic Armory'))).toBe('unlearned');
  expect(bonusState(d({lairBossNodes:['Exotic Armory']}),bonus('Exotic Armory'))).toBe('active');
 });
 it('a bonus above the rank is locked',()=>{
  expect(bonusState(rank(10),bonus('Impending Doom'))).toBe('locked');
  expect(bonusState(rank(null),bonus('Impending Doom'))).toBe('locked');
 });
 it("bonusState reads the active splinter's rank only",()=>{
  const p={...rank(null),splinterRanks:{terror:null,destruction:20,hatred:null}};
  expect(bonusState(p,bonus('Impending Doom'))).toBe('locked');
 });
 it('rank input clamps to 0-24 and treats empty as not set',()=>{
  expect(parseRank('')).toBeNull();
  expect(parseRank('30')).toBe(24);
  expect(parseRank('-2')).toBe(0);
  expect(parseRank('abc')).toBeUndefined();
 });
});
