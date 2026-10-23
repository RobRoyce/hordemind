import type {Comparison,Estimate,OfferAssessment} from '../recommendation/model';
import {resolveOffer} from '../catalog';
import {Help} from './Help';
import {familyClass,type Slot} from './OfferPicker';
import type {RecommendationState} from './useRecommendations';
import {wrongInfoUrl} from './report';

interface Props{
 state:RecommendationState;slots:Slot[];chosen:number|null;special:number|null;remainingWaves:number;
 onChoose:(slot:number)=>void;
 /** Run details prefilled into issue reports. */
 reportContext:string;
}
const signed=(n:number)=>(n<0?'−':'+')+Math.round(Math.abs(n));

function Card({item,rank,best,chosen,special,onChoose,reportContext}:{item:OfferAssessment;rank:number;best:boolean;chosen:boolean;special:boolean;onChoose:()=>void;reportContext:string}){
 const ref=resolveOffer(item.offer);
 return <article className={'recommend-card'+(best?' best':'')+(item.modeled?'':' unsupported')+(chosen?' chosen':'')}>
  <div className="recommend-head">
   <div>
    <span className="recommend-rank">{best?'Best':`#${rank}`}</span>
    <strong>{item.offer}</strong>
    <span className={familyClass(ref)}>{ref?.family??'Unlisted'}</span>
    {ref?.danger&&<span className={'danger danger-'+ref.danger.level} title={ref.danger.why}>{ref.danger.level==='high'?'High danger':'Some danger'}</span>}
    {special&&<span className="pact-tag">Pact · one use</span>}
   </div>
   <div className="recommend-metric">
    {item.modeled?<><b>{signed(item.mean)}</b><small>Aether, modeled</small></>:<><b>Not modeled</b><small>not a +0 estimate</small></>}
   </div>
  </div>
  {item.modeled?<Details item={item} reportContext={reportContext}/>:<>
   <p className="offer-explanation">{item.reason}</p>
   <a className="report-link" href={wrongInfoUrl(item.offer,'Not modeled: '+item.reason,reportContext)} target="_blank" rel="noreferrer">Know what this does? Report it</a>
  </>}
  {ref?.danger&&<p className="danger-note">Bane: {ref.danger.why}. Danger is not counted in the estimate.</p>}
  <button type="button" className={best?'primary':''} aria-pressed={chosen} onClick={onChoose}>{chosen?'Chosen':'Choose'}</button>
 </article>;
}

function Details({item,reportContext}:{item:Estimate;reportContext:string}){
 return <>
  <p className="offer-explanation">{item.reasons[0]}</p>
  {item.synergies.map(s=><p key={s.offer} className="synergy">Makes a later <b>{s.offer}</b> worth {signed(s.withThis)} instead of {signed(s.without)}.</p>)}
  <details className="model-details"><summary>Why this estimate</summary>
   {item.reasons.slice(1).map((reason,i)=><p key={i}>{reason}</p>)}
   <p className="model-interval">Simulated 5–95% range: {Math.round(item.low)} to {Math.round(item.high)} Aether <Help message="The spread across simulated runs under the model's assumptions. It is not a calibrated confidence interval."/></p>
   <div className="component-breakdown">{Object.entries(item.components).filter(([,x])=>Math.abs(x)>1).sort((a,b)=>b[1]-a[1]).map(([kind,v])=><span key={kind}>{kind} {signed(v)}</span>)}</div>
   {item.sensitivity.length>0&&<table className="sensitivity"><caption>Under other timing assumptions</caption><tbody>
    {item.sensitivity.map(s=><tr key={s.name}><th scope="row">{s.name}</th><td>{signed(s.mean)}</td></tr>)}
   </tbody></table>}
   {item.assumptions.map((a,i)=><p key={i} className="micro">{a}</p>)}
   <a className="report-link" href={wrongInfoUrl(item.offer,`Estimate ${signed(item.mean)} Aether. ${item.reasons.join(' ')} ${item.assumptions.join(' ')}`,reportContext)} target="_blank" rel="noreferrer">Something wrong? Report it</a>
  </details>
 </>;
}

function Verdict({result}:{result:Comparison}){
 if(!result.recommended)return null;
 const danger=resolveOffer(result.recommended)?.danger;
 const warning=danger?.level==='high'&&<p className="verdict close">{result.recommended} has a dangerous bane: {danger.why}. The estimate ignores danger, so weigh it yourself.</p>;
 if(result.robust===null)return warning||null;
 return <>{warning}{result.robust?
  <p className="verdict robust">{result.recommended} stays best under every timing assumption tested.</p>:
  <p className="verdict close">Close call: the best offer changes under other plausible timing assumptions. Expand an offer to compare.</p>}</>;
}

export function OfferRecommendations({state,slots,chosen,special,remainingWaves,onChoose,reportContext}:Props){
 const {result,busy,error}=state;
 const slotOf=(offer:string)=>slots.findIndex(s=>s.offer===offer);
 const general=result?.warnings.filter(w=>!w.startsWith('Some offers')&&!w.startsWith('The best offer changes'))??[];
 return <section className={'surface recommendations'+(busy&&result?' stale':'')} aria-labelledby="rec-title" aria-busy={busy}>
  <div className="section-header">
   <h2 id="rec-title">Recommendation</h2>
   <span className="chip">Experimental</span>
  </div>
  {error&&<p role="alert" className="error-msg">The simulator failed: {error}</p>}
  {!result&&!error&&(busy?<p className="progress-msg" role="status">Simulating…</p>:<p className="empty-hint">Enter at least two offers to compare them.</p>)}
  {result&&<>
   {result.conditional&&<p className="recommend-alert">Some offers aren't modeled yet, so the best modeled offer may not be the best offer.</p>}
   <Verdict result={result}/>
   {result.pact&&<div className="pact-advice" role="note"><strong>Black Pact</strong><p>{result.pact.advice}</p></div>}
   {result.assessments.map((item,index)=>{
    const slot=slotOf(item.offer);
    return <Card key={item.offer} item={item} rank={index+1} best={index===0&&item.modeled}
     chosen={slot>=0&&slot===chosen} special={slot>=0&&slot===special} onChoose={()=>slot>=0&&onChoose(slot)} reportContext={reportContext}/>;
   })}
   <details className="model-footnote"><summary>{result.samples} simulated runs · {result.modelVersion} · {remainingWaves} waves left</summary>
    {general.map((w,i)=><p key={i}>{w}</p>)}
   </details>
  </>}
 </section>;
}
