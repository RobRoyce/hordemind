import type {CharacterAnalysis} from '../../analysis/analyze';
import type {RangeStats} from '../../analysis/reportCard';
import {SectionHeading} from '../kit';
import {familyLine,headlineParts,leftOutText,missCell,needsText,percent} from './insightsText';
import s from './ReportCardSection.module.css';

const inRange=(st:RangeStats)=>percent(st.inRange,st.readings);

/** How well the model's 80% range matched the Aether gains in the active character's runs. */
export function ReportCardSection({name,analysis}:{name:string|null;analysis:CharacterAnalysis|null}){
 const report=analysis?.report??null;
 const hp=report&&headlineParts(report.buckets.inRange,report.buckets.readings);
 const note=analysis&&leftOutText(analysis.leftOut,analysis.skipped);
 return <section aria-labelledby="report-card" className={s.section}>
  <SectionHeading id="report-card">Report card</SectionHeading>
  {!analysis||!name?<p className={s.empty}>Choose a character on the Character screen to see its report card.</p>:<>
   <p className={s.scope}>For {name}.</p>
   {!report?<p className={s.empty}>{needsText(analysis.needed)}</p>:<>
    {hp&&<p className={s.headline}>{hp.before}<span className={s.num}>{hp.percent}</span>{hp.after}</p>}
    <table className={s.table}>
     <thead><tr><th scope="col"><span className="hm-visually-hidden">Measure</span></th><th scope="col">Your buckets</th>{report.calibrated&&<th scope="col">Calibrated</th>}</tr></thead>
     <tbody>
      <tr><th scope="row">Inside the range</th><td data-label="Your buckets">{inRange(report.buckets)}</td>{report.calibrated&&<td data-label="Calibrated">{inRange(report.calibrated)}</td>}</tr>
      <tr><th scope="row">Average miss</th><td data-label="Your buckets">{missCell(report.buckets.averageMiss)}</td>{report.calibrated&&<td data-label="Calibrated">{missCell(report.calibrated.averageMiss)}</td>}</tr>
     </tbody>
    </table>
    {report.byFamily.length>0&&<ul className={s.families}>
     {report.byFamily.map(f=><li key={f.family}>{familyLine(f.family,f.stats.readings,f.stats.averageMiss)}</li>)}
    </ul>}
   </>}
   {note&&<p className={s.note}>{note}</p>}
  </>}
 </section>;
}
