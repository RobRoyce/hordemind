import type {PactAdvice as Advice} from '../../recommendation/model';
import {Notice} from '../kit';
import s from './PactAdvice.module.css';

export function PactAdvice({pact}:{pact:Advice}){
 return <Notice tone="info" label="Black Pact advice">
  <p className={s.text}><strong className={s.title}>Black Pact.</strong> {pact.advice}</p>
 </Notice>;
}
