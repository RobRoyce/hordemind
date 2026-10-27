import type {OverrideSummary} from '../../analysis/overrides';
import {Numeral,SectionHeading} from '../kit';
import {choicesLeftOutText,costText,gapText,rankedText} from './insightsText';
import s from './ChoicesSection.module.css';

/** How the active character's recorded picks met the recommendation. Disagreements are data, not errors. */
export function ChoicesSection({name,overrides,allMiss}:{name:string|null;overrides:OverrideSummary|null;allMiss:number|null}){
 const o=overrides;
 const leftOut=o&&choicesLeftOutText(o.skippedOlder,o.gapLeftOut);
 const recorded=o?o.tookDefault+o.pickedSame+o.tookOther:0;
 return <section aria-labelledby="your-choices" className={s.section}>
  <SectionHeading id="your-choices">Your choices</SectionHeading>
  {!o||!name?<p className={s.empty}>Choose a character on the Character screen to see its choices.</p>:<>
   <p className={s.scope}>For {name}.</p>
   {recorded===0?<p className={s.empty}>Choices you record in Live Run while a recommendation is showing appear here.</p>:<>
    <div className={s.counts}>
     <Numeral label="Took the pre-selected pick" value={o.tookDefault}/>
     <Numeral label="Picked it yourself" value={o.pickedSame}/>
     <Numeral label="Took another offer" value={o.tookOther}/>
    </div>
    {o.cost&&<p className={s.line}>{costText(o.cost,o.tookOther)}</p>}
    {o.forecastGap&&<p className={s.line}>{gapText(o.forecastGap.average,allMiss)}</p>}
    {o.pickedAgainst.length>0&&<p className={s.line}>{rankedText('Offers you took most often over the recommendation',o.pickedAgainst)}</p>}
    {o.skippedRecommendations.length>0&&<p className={s.line}>{rankedText('Recommendations you passed on most often',o.skippedRecommendations)}</p>}
   </>}
   {leftOut&&<p className={s.note}>{leftOut}</p>}
  </>}
 </section>;
}
