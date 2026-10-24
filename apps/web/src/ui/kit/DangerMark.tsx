import type {Danger} from '../../catalog';
import {cx} from './cx';
import s from './DangerMark.module.css';

export function DangerMark({danger}:{danger:Danger}){
 return <span className={cx(s.danger,danger.level==='high'&&s.high)} title={danger.why}>
  {danger.level==='high'?'High danger':'Some danger'}
 </span>;
}
