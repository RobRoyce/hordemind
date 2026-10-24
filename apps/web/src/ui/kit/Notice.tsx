import type {ReactNode} from 'react';
import {cx} from './cx';
import s from './Notice.module.css';

interface Props{tone:'info'|'warning'|'error';label?:string;children:ReactNode}

export function Notice({tone,label,children}:Props){
 return <div role={tone==='error'?'alert':'note'} aria-label={label} className={cx(s.notice,s[tone])}>{children}</div>;
}
