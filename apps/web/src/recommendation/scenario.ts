import type {RunRecord} from '../domain/schema';
import {project} from '../domain/run';
import {compareScenario,type Comparison,type Scenario} from './model';

/** Maps a recorded run onto the pure model input; the worker receives only this. */
export function scenarioFromRun(run:RunRecord):Scenario{
 const p=project(run);
 return {
  history:p.chosen.map(o=>o.payload.chosen),totalWaves:p.totalWaves,decisionWave:p.nextWave,
  profile:{killSpeed:p.profile.killSpeed,mobility:p.profile.mobility,warPlanNodes:[...p.profile.warPlanNodes],splinterRank:p.profile.splinterRank}
 };
}
export function compareRun(run:RunRecord,offered:string[],samples=420):Comparison{
 return compareScenario(scenarioFromRun(run),offered,samples);
}
