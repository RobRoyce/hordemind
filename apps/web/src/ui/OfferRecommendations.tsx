import type {Estimate,OfferAssessment} from '../recommendation/model';
import {resolveOffer} from '../catalog';
import {Help} from './Help';
import {familyClass,type Slot} from './OfferPicker';
import type {RecommendationState} from './useRecommendations';

interface Props{
 state:RecommendationState;slots:Slot[];chosen:number|null;special:number|null;remainingWaves:number;
 onChoose:(slot:number)=>void;
}
const signed=(n:number)=>(n<0?'−':'+')+Math.round(Math.abs(n));

function Card({item,rank,best,chosen,special,remainingWaves,onChoose}:{item:OfferAssessment;rank:number;best:boolean;chosen:boolean;special:boolean;remainingWaves:number;onChoose:()=>void}){
 const ref=resolveOffer(item.offer);
 return <article className={'recommend-card'+(best?' best':'')+(item.modeled?'':' unsupported')+(chosen?' chosen':'')}>
  <div className="recommend-head">
   <div>
    <span className="recommend-rank">{best?'Best':`#${rank}`}</span>
    <strong>{item.offer}</strong>
    <span className={familyClass(ref)}>{ref?.family??'Unlisted'}</span>
    {special&&<span className="pact-tag">Pact · one use</span>}
   </div>
   <div className="recommend-metric">
    {item.modeled?<><b>{signed(item.mean)}</b><small>Aether, modeled</small></>:<><b>Not modeled</b><small>not a +0 estimate</small></>}
   </div>
  </div>
  {item.modeled?<>
   <p className="offer-explanation">{item.reasons[0]}</p>
   {special&&remainingWaves>1&&<p className="uncertainty">Taking it now uses the Pact offer. Its value on a later wave is not included in this estimate.</p>}
   <details className="model-details"><summary>Why this estimate</summary>
    {item.reasons.slice(1).map((reason,i)=><p key={i}>{reason}</p>)}
    <p className="model-interval">Simulated 5–95% range: {Math.round(item.low)} to {Math.round(item.high)} Aether <Help message="The spread across simulated runs under the model's assumptions. It is not a calibrated confidence interval."/></p>
    <div className="component-breakdown">{Object.entries((item as Estimate).components).filter(([,x])=>Math.abs(x)>1).sort((a,b)=>b[1]-a[1]).map(([kind,v])=><span key={kind}>{kind} {signed(v)}</span>)}</div>
    <p className="micro">{item.assumptions.join(' ')}</p>
   </details>
  </>:<p className="offer-explanation">{item.reason}</p>}
  <button type="button" className={best?'primary':''} aria-pressed={chosen} onClick={onChoose}>{chosen?'Chosen':'Choose'}</button>
 </article>;
}

export function OfferRecommendations({state,slots,chosen,special,remainingWaves,onChoose}:Props){
 const {result,busy,error}=state;
 const slotOf=(offer:string)=>slots.findIndex(s=>s.offer===offer);
 return <section className={'surface recommendations'+(busy&&result?' stale':'')} aria-labelledby="rec-title" aria-busy={busy}>
  <div className="section-header">
   <h2 id="rec-title">Recommendation</h2>
   <span className="chip">Experimental</span>
  </div>
  {error&&<p role="alert" className="error-msg">The simulator failed: {error}</p>}
  {!result&&!error&&(busy?<p className="progress-msg" role="status">Simulating…</p>:<p className="empty-hint">Enter at least two offers to compare them.</p>)}
  {result&&<>
   {result.conditional&&<p className="recommend-alert">Some offers aren't modeled yet, so the best modeled offer may not be the best offer.</p>}
   {result.assessments.map((item,index)=>{
    const slot=slotOf(item.offer);
    return <Card key={item.offer} item={item} rank={index+1} best={index===0&&item.modeled}
     chosen={slot>=0&&slot===chosen} special={slot>=0&&slot===special} remainingWaves={remainingWaves} onChoose={()=>slot>=0&&onChoose(slot)}/>;
   })}
   <p className="model-footnote">{result.samples} simulated runs · {result.modelVersion}. Rough estimates from uncalibrated assumptions. Future offers and the Pact offer's later value are not modeled yet.</p>
  </>}
 </section>;
}
