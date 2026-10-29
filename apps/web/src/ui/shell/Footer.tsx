import {IH_GRAPH} from '../../domain/warPlans';
import {ICON_AUTHORS,IH_ROOT_ICON,LB_ROOT_ICON,PLAN_ICONS} from '../character/warPlanIcons';
import {Disclosure} from '../kit';
import s from './Footer.module.css';

const AUTHORS=`${ICON_AUTHORS.slice(0,-1).join(', ')} and ${ICON_AUTHORS.at(-1)}`;
const IN_HORDES=new Set(IH_GRAPH.nodes.map(n=>n.name));
/** One line per icon, each tree's top node first, then its upgrades. */
const CREDITS=([['Infernal Hordes',IH_ROOT_ICON,true],['Lair Bosses',LB_ROOT_ICON,false]] as const).flatMap(([plan,root,hordes])=>
 [['Top node',root] as const,...Object.entries(PLAN_ICONS).filter(([name])=>IN_HORDES.has(name)===hordes)]
  .map(([node,i])=>`${node}, ${plan} War Plan: ${i.name} by ${i.author}`));

export function Footer({reportUrl,sourceUrl}:{reportUrl:string;sourceUrl:string}){
 return <footer className={s.footer}>
  <p>Recommendations come from an experimental simulator that hasn't been calibrated against real runs. Runs are saved in this browser, and nothing leaves it unless you turn on private sync.</p>
  <p>
   Offer text © Blizzard Entertainment. Icons by {AUTHORS} from <a href="https://game-icons.net/" target="_blank" rel="noreferrer">game-icons.net</a>,{' '}
   <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>.
   <span className={s.links}>
    <a href={reportUrl} target="_blank" rel="noreferrer">Report a problem</a>
    <a href={sourceUrl} target="_blank" rel="noreferrer">Source</a>
   </span>
  </p>
  <Disclosure summary="Icon credits">
   <ul className={s.credits}>{CREDITS.map(c=><li key={c}>{c}</li>)}</ul>
  </Disclosure>
 </footer>;
}
