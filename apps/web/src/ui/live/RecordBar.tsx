import {Button} from '../kit';
import s from './RecordBar.module.css';

interface Props{
 /** The selected row's offer, or null when nothing is selected. */
 offer:string|null;
 rows:number;
 onRecord:()=>void;
}

/** Records the selected offer. On phones it sticks above the tab bar. */
export function RecordBar({offer,rows,onRecord}:Props){
 return <div className={s.bar} data-record-bar="">
  <Button variant="primary" onClick={onRecord} disabled={offer===null} data-entry>{offer?`Take ${offer}`:'Choose the offer you took'}</Button>
  <span className={s.keys}>1–{rows} to choose{offer?' another':''}, Ctrl or ⌘ Enter to record</span>
 </div>;
}
