import {useId,useState,type ReactNode} from 'react';
import {resolveOffer} from '../../catalog';
import type {OfferAssessment} from '../../recommendation/model';
import {CategoryMark,DangerMark,cx} from '../kit';
import {wrongInfoUrl} from '../report';
import {EstimateDetails,estimateReportUrl,signed} from './EstimateDetails';
import type {Slot} from './slot';
import s from './OfferSlot.module.css';

interface Props{
 index:number;slot:Slot;
 /** The row's OfferPicker. Its parts join this row's grid. */
 picker:ReactNode;
 pact:boolean;selected:boolean;best:boolean;
 /** A newer estimate is on its way, so values dim in place. */
 busy:boolean;
 assessment:OfferAssessment|null;
 reportContext:string;
 /** Extra rows and the Pact row are removed; the first rows are only cleared. */
 removable:boolean;
 onSelect:()=>void;onClear:()=>void;
}

export function OfferSlot({index,slot,picker,pact,selected,best,busy,assessment,reportContext,removable,onSelect,onClear}:Props){
 const [open,setOpen]=useState(false);
 const detailsId=useId();
 const ref=slot.offer&&!slot.unlisted?resolveOffer(slot.offer):null;
 const n=index+1;

 let estimate:ReactNode=null;
 if(slot.offer&&!assessment)estimate=<span className={cx(s.estimate,s.none)}><span aria-hidden="true">—</span><span className="hm-visually-hidden">No estimate yet</span></span>;
 else if(slot.offer&&assessment){
  const value=assessment.modeled?signed(assessment.mean):'not modeled';
  estimate=<button type="button" className={cx(s.estimate,!assessment.modeled&&s.unmodeled,busy&&s.dim)}
   aria-label={`Estimate for ${assessment.offer}: ${assessment.modeled?`${value} Aether`:value}`}
   aria-expanded={open} aria-controls={detailsId} onClick={()=>setOpen(o=>!o)}>{value}</button>;
 }

 return <li className={cx(s.row,selected&&s.selected,best&&s.best,pact&&s.pact)}>
  <button type="button" className={s.numeral} aria-pressed={selected} disabled={!slot.offer}
   aria-label={`Choose offer ${n}${slot.offer?`: ${slot.offer}`:''}`} onClick={onSelect}>{n}</button>
  {picker}
  {(slot.offer||pact)&&<div className={s.meta}>
   {pact&&<span className={s.pactLabel}>Black Pact</span>}
   {slot.offer&&<CategoryMark family={ref?.family??null}/>}
   {ref?.danger&&<DangerMark danger={ref.danger}/>}
  </div>}
  {estimate}
  {(removable||slot.text)&&<button type="button" className={s.clear} onClick={onClear}
   aria-label={pact?'Remove the Black Pact offer':removable?`Remove offer ${n}`:`Clear offer ${n}`}>×</button>}
  {open&&assessment&&<div id={detailsId} className={s.details}>
   {assessment.modeled?<EstimateDetails estimate={assessment} reportUrl={estimateReportUrl(assessment,reportContext)}/>:<>
    <p className={s.reason}>{assessment.reason}</p>
    <a className={s.report} href={wrongInfoUrl(assessment.offer,'Not modeled: '+assessment.reason,reportContext)} target="_blank" rel="noreferrer">Know what this does? Report it</a>
   </>}
  </div>}
 </li>;
}
