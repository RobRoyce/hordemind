import type {Comparison,Estimate,OfferAssessment} from '../recommendation/model';
import {Help} from './Help';

interface Props {
 result:Comparison|null;
 loading:boolean;
 error:string;
 offered:string[];
 specialSlotIndex:number|null;
 remainingWaves:number;
 onSelect:(index:number)=>void;
}
function aether(n:number){return (n<0?'−':'+')+Math.round(Math.abs(n))+' Aether'}
function Item({item,index,recommended,special,remainingWaves,onSelect}:{item:OfferAssessment;index:number;recommended:boolean;special:boolean;remainingWaves:number;onSelect:()=>void}){
 return <div className={'recommend-card '+(recommended?'recommended':'')+(item.modeled?'':' unsupported')}>
  <div className="recommend-head">
   <div><span className="recommend-rank">{recommended?'★ ':'#'+(index+1)+' '}</span><strong>{item.offer}</strong>
    {special&&<span className="risk-tag">Special offer · one use</span>}
   </div>
   <div className="recommend-metric">
    {item.modeled?<><b>{aether(item.mean)}</b><small>Modeled marginal gain</small></>:<><b>Not scored</b><small>Unverified mechanics</small></>}
   </div>
  </div>
  {item.modeled?
   <>
    <p className="model-interval">Modeled 5–95% outcome range: {Math.round(item.low)} to {Math.round(item.high)} Aether <Help message="This is a percentile range across simulated scenarios, not a calibrated confidence interval or a guarantee."/></p>
    <p className="offer-explanation">{item.reasons[0]}</p>
    {special&&remainingWaves>0&&<p className="uncertainty">Choosing the special option consumes it. The value of saving it for {remainingWaves} later waves is NOT included in these estimates.</p>}
    <details className="model-details"><summary>Why this estimate?</summary>
      {item.reasons.slice(1).map((reason,i)=><p key={i}>{reason}</p>)}
      <div className="component-breakdown">{Object.entries((item as Estimate).components).filter(([,x])=>Math.abs(x)>1).sort((a,b)=>b[1]-a[1]).map(([kind,v])=><span key={kind}>{kind}: {v>=0?'+':''}{Math.round(v)}</span>)}</div>
      <p className="micro">{item.assumptions.join(' ')}</p>
    </details>
   </>:<p className="offer-explanation">{item.reason}</p>}
  <button onClick={onSelect} className={recommended?'primary':'secondary'}>Select this offering</button>
 </div>;
}
export function OfferRecommendations({result,loading,error,offered,specialSlotIndex,remainingWaves,onSelect}:Props){
 return <section className="surface recommendations" aria-label="Offer recommendations">
  <div className="section-header"><div><h2>Which offering should I take?</h2><p>Estimates from your saved build, War Plans, earlier selections and remaining waves.</p></div><span className="chip">Experimental simulator</span></div>
  {loading&&<p role="status" className="progress-msg">Comparing offerings with matched seeded simulations…</p>}
  {error&&<p role="alert" className="error-msg">{error}</p>}
  {!loading&&!error&&!result&&<p className="empty-hint">Enter at least two offerings above to see ranked recommendations and why they work together.</p>}
  {result&&!loading&&<>
   {result.conditional&&<div className="recommend-alert"><strong>Incomplete comparison</strong><p>Some offerings have unverified mechanics and cannot be reliably ranked. The top option below is only best among modeled choices.</p></div>}
   {result.assessments.map((assessment,index)=>{
    const slot=offered.findIndex(x=>x.trim()===assessment.offer);
    return <Item key={assessment.offer} index={index} item={assessment} recommended={index===0&&assessment.modeled} special={slot===specialSlotIndex} remainingWaves={remainingWaves} onSelect={()=>onSelect(slot)} />;
   })}
   <div className="model-footnote">
    <strong>{result.samples} seeded trials · {result.modelVersion}</strong>
    <p>{result.warnings.join(' ')} This version does not yet simulate future offers or learn event rates from crowdsourced runs.</p>
   </div>
  </>}
 </section>;
}
