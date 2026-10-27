import type {CharacterProfile,RunRecord} from '../domain/schema';
import {project} from '../domain/run';
import {terrorRank} from '../domain/splinters';
import {compareScenario,type Comparison,type Scenario} from './model';

/** The profile fields the model reads; Terror's rank counts only while Terror is active. */
export const playerProfile=(p:CharacterProfile):Scenario['profile']=>({killSpeed:p.killSpeed,mobility:p.mobility,warPlanNodes:[...p.warPlanNodes],terrorRank:terrorRank(p)});

/** Maps a recorded run onto the pure model input; the worker receives only this. */
export function scenarioFromRun(run:RunRecord):Scenario{
 const p=project(run);
 return {
  history:p.chosen.map(o=>o.payload.chosen),totalWaves:p.totalWaves,decisionWave:p.nextWave,
  profile:playerProfile(p.profile)
 };
}
export function compareRun(run:RunRecord,offered:string[],samples=420):Comparison{
 return compareScenario(scenarioFromRun(run),offered,samples);
}
