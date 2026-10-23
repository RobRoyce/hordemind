import {GAME_TEXT_SOURCE} from '../catalog';
import {RECOMMENDER_VERSION} from '../recommendation/model';

export const REPO_URL='https://github.com/RobRoyce/hordemind';
/** GitHub rejects very long URLs; keep prefilled text well under its limit. */
const MAX_FIELD=1200;
const clip=(s:string)=>s.length>MAX_FIELD?s.slice(0,MAX_FIELD-1)+'…':s;

/** Opens the "Wrong game information" form with what HordeMind showed. Nothing is sent until the user submits. */
export function wrongInfoUrl(item:string,hordemind:string,context=''):string{
 const params=new URLSearchParams({
  template:'wrong-game-info.yml',title:`[Game info] ${item}`,item,hordemind:clip(hordemind),
  ...(context?{context:clip(context)}:{}),version:`${RECOMMENDER_VERSION} · game text build ${GAME_TEXT_SOURCE.build}`
 });
 return `${REPO_URL}/issues/new?${params}`;
}
export const newIssueUrl=`${REPO_URL}/issues/new/choose`;
