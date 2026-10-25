import {resolveOffer} from '../../catalog';
import type {Comparison,Estimate} from '../../recommendation/model';
import {Disclosure,Frame,cx} from '../kit';
import {EstimateDetails,estimateReportUrl,signed} from './EstimateDetails';
import {robustnessLine} from './robustness';
import s from './PickCard.module.css';

interface Props{
 result:Comparison;
 /** A newer result is on its way, so the values dim in place. */
 busy:boolean;
 /** Run details prefilled into issue reports. */
 reportContext:string;
}

/** The best modeled offer in the carved frame. Renders nothing when no modeled offer leads. */
export function PickCard({result,busy,reportContext}:Props){
 const modeled=result.assessments.filter((a):a is Estimate=>a.modeled);
 const best=modeled.find(a=>a.offer===result.recommended);
 if(!best)return null;
 const runnerUp=modeled.find(a=>a!==best);
 const danger=resolveOffer(best.offer)?.danger;
 const robustness=robustnessLine(result);
 return <Frame label="Recommendation">
  <div className={cx(s.card,busy&&s.busy)} aria-busy={busy}>
   <p className={s.kicker}>{result.robust===false?'Close call':'Best pick'}</p>
   <h2 className={s.name}>{best.offer}</h2>
   <p><span className={s.value}>{signed(best.mean)} Aether</span> by run end{runnerUp&&`, ${Math.round(best.mean-runnerUp.mean)} more than ${runnerUp.offer}`}</p>
   {best.reasons[0]&&<p className={s.why}>{best.reasons[0]}</p>}
   {robustness&&<p role="note" aria-label="Robustness" className={s.small}>{robustness}</p>}
   {danger?.level==='high'&&<p className={s.danger}>Bane: {danger.why}. The estimate ignores danger.</p>}
   <Disclosure summary="Why this estimate">
    <EstimateDetails estimate={best} reportUrl={estimateReportUrl(best,reportContext)} skipFirstReason/>
    <p className={s.small}>Model {result.modelVersion}, {result.samples} simulated runs.</p>
   </Disclosure>
  </div>
 </Frame>;
}
