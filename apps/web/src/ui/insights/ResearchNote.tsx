import {SectionHeading} from '../kit';
import s from './ResearchNote.module.css';

export function ResearchNote(){
 return <section className={s.section} aria-label="Community research">
  <SectionHeading level={3}>Community research</SectionHeading>
  <p className={s.text}>Nothing is shared for community research. Any future opt-in will be separate from private sync, with clear withdrawal and deletion.</p>
 </section>;
}
