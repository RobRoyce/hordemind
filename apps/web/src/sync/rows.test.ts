import {describe,it,expect} from 'vitest';
import {newProfile,newRun,recordDecision,endRun} from '../domain/run';
import {profileToRow,profileFromRow,runToRow,runFromRows,eventToRow} from './rows';

const owner='11111111-1111-4111-8111-111111111111';

describe('database row mapping',()=>{
 it('round-trips a profile',()=>{
  const p={...newProfile('Paladin','Paladin'),difficulty:'Torment XII' as const};
  expect(profileFromRow(profileToRow(p,owner))).toEqual(p);
 });
 it('round-trips a run journal, including Postgres timestamp formatting',()=>{
  let run=recordDecision(newRun(newProfile('Paladin','Paladin'),3),{offered:['A','B'],chosenIndex:0});
  run=recordDecision(run,{offered:['C','D'],chosenIndex:1,observation:{totalAether:40,eventCounts:{mass:3}}});
  run=endRun(run,'abandoned',55);
  const row=runToRow(run,owner,new Set());
  const events=run.events.map(eventToRow).reverse().map(e=>({...e,recorded_at:e.recorded_at.replace('Z','+00:00')}));
  expect(runFromRows({...row,started_at:row.started_at.replace('Z','+00:00')},events)).toEqual(run);
  expect(row.run_status).toBe('abandoned');
  expect(row.completed_at).not.toBeNull();
 });
 it('links a run to its profile only when that profile is synced',()=>{
  const p=newProfile('Paladin','Paladin'),run=newRun(p,3);
  expect(runToRow(run,owner,new Set()).profile_id).toBeNull();
  expect(runToRow(run,owner,new Set([p.id])).profile_id).toBe(p.id);
 });
});
