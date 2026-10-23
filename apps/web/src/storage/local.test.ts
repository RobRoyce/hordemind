import {describe,it,expect} from 'vitest';
import {createLocalRepository,STORAGE_KEY} from './local';
import {EMPTY_STATE} from '../domain/schema';

function memoryStorage(initial:Record<string,string>={}):Storage{
 const data=new Map(Object.entries(initial));
 return {
  get length(){return data.size},
  clear:()=>data.clear(),
  getItem:k=>data.get(k)??null,
  key:i=>[...data.keys()][i]??null,
  removeItem:k=>{data.delete(k)},
  setItem:(k,v)=>{data.set(k,String(v))}
 };
}

describe('local repository',()=>{
 it('round-trips valid state',()=>{
  const storage=memoryStorage(),repo=createLocalRepository(storage);
  repo.save(EMPTY_STATE);
  expect(repo.load()).toEqual({state:EMPTY_STATE,status:'ok'});
 });
 it('keeps unreadable data untouched and backs it up under its own key',()=>{
  const raw=JSON.stringify({schemaVersion:99,future:true});
  const storage=memoryStorage({[STORAGE_KEY]:raw}),repo=createLocalRepository(storage);
  const result=repo.load();
  expect(result.status).toBe('unreadable');
  expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  expect(result.backupKey&&storage.getItem(result.backupKey)).toBe(raw);
  repo.load();
  expect(storage.length).toBe(2);
 });
 it('refuses to persist invalid state',()=>{
  const storage=memoryStorage(),repo=createLocalRepository(storage);
  expect(()=>repo.save({...EMPTY_STATE,activeRunId:'not-a-uuid'})).toThrow();
  expect(storage.getItem(STORAGE_KEY)).toBeNull();
 });
});
