import s from './Footer.module.css';

export function Footer({reportUrl,sourceUrl}:{reportUrl:string;sourceUrl:string}){
 return <footer className={s.footer}>
  <p>Recommendations come from an experimental simulator that hasn't been calibrated against real runs.</p>
  <p>Runs are saved in this browser. Nothing leaves it unless you turn on private sync.</p>
  <p>Offer text © Blizzard Entertainment.</p>
  <p className={s.links}>
   <a href={reportUrl} target="_blank" rel="noreferrer">Report a problem</a>
   <a href={sourceUrl} target="_blank" rel="noreferrer">Source</a>
  </p>
 </footer>;
}
