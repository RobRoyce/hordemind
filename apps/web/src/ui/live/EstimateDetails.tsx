import type {Estimate} from '../../recommendation/model';
import {wrongInfoUrl} from '../report';
import s from './EstimateDetails.module.css';

export const signed=(n:number)=>(n<0?'−':'+')+Math.round(Math.abs(n));

/** The wrong-info issue form, prefilled with this estimate and the run. */
export function estimateReportUrl(item:Estimate,context:string){
 return wrongInfoUrl(item.offer,`Estimate ${signed(item.mean)} Aether. ${item.reasons.join(' ')} ${item.assumptions.join(' ')}`,context);
}

interface Props{
 estimate:Estimate;
 reportUrl:string;
 /** The first reason already shows above these details. */
 skipFirstReason?:boolean;
}

export function EstimateDetails({estimate:e,reportUrl,skipFirstReason=false}:Props){
 const components=Object.entries(e.components).filter(([,v])=>Math.abs(v)>1).sort((a,b)=>b[1]-a[1]);
 return <div className={s.details}>
  {e.reasons.slice(skipFirstReason?1:0).map((reason,i)=><p key={i}>{reason}</p>)}
  {e.synergies.map(x=><p key={x.offer}>Makes a later <b>{x.offer}</b> worth {signed(x.withThis)} instead of {signed(x.without)}.</p>)}
  <p>
   Simulated 5–95% range: {Math.round(e.low)} to {Math.round(e.high)} Aether.
   <span className={s.muted}> It's the spread across simulated runs under the model's assumptions, not a calibrated confidence interval.</span>
  </p>
  {components.length>0&&<dl className={s.components} aria-label="Aether by source">
   {components.map(([kind,v])=><div key={kind}><dt>{kind}</dt><dd>{signed(v)}</dd></div>)}
  </dl>}
  {e.sensitivity.length>0&&<table className={s.table}>
   <caption>Under other timing assumptions</caption>
   <tbody>{e.sensitivity.map(x=><tr key={x.name}><th scope="row">{x.name}</th><td>{signed(x.mean)}</td></tr>)}</tbody>
  </table>}
  {e.assumptions.map((a,i)=><p key={i} className={s.muted}>{a}</p>)}
  <a className={s.report} href={reportUrl} target="_blank" rel="noreferrer">Something wrong? Report it</a>
 </div>;
}
