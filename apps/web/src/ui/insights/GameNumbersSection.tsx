import type {GameCounts} from '../../analysis/counts';
import {Disclosure,SectionHeading} from '../kit';
import {chaoticLine,offerSetLabel,percent,repeatLine,varshanLine} from './insightsText';
import s from './GameNumbersSection.module.css';

const OFFER_SETS=['reign','chaos','neither'] as const;
const TOP_OFFERS=8;

/** Plain tallies across every character's runs. */
export function GameNumbersSection({counts}:{counts:GameCounts}){
 const sets=OFFER_SETS.reduce((a,k)=>a+counts.offers[k].sets,0);
 const lines=[
  chaoticLine(counts.chaotic.neither,counts.chaotic.withTotalChaos,counts.offers.reign.sets),
  repeatLine(counts.repeats.withMadness,counts.repeats.withoutMadness),
  varshanLine(counts.varshan.with,counts.varshan.without)
 ].filter((l):l is string=>l!==null);
 return <section aria-labelledby="game-numbers" className={s.section}>
  <SectionHeading id="game-numbers">Game numbers</SectionHeading>
  {sets===0?<p className={s.empty}>Record offer sets in Live Run to see these counts.</p>:<>
   <p className={s.scope}>Counted across all your characters.</p>
   {lines.map(l=><p key={l} className={s.line}>{l}</p>)}
   <Disclosure summary="How often each offer appeared">
    <div className={s.frequency}>
     {OFFER_SETS.filter(k=>counts.offers[k].sets>0).map(k=>{
      const {sets,counts:top}=counts.offers[k];
      return <div key={k}>
       <p className={s.line}>{offerSetLabel(k,sets)}</p>
       <ul className={s.offers}>
        {top.slice(0,TOP_OFFERS).map(o=><li key={o.offer}>{o.offer} {percent(o.count,sets)}</li>)}
       </ul>
      </div>;
     })}
    </div>
   </Disclosure>
  </>}
 </section>;
}
