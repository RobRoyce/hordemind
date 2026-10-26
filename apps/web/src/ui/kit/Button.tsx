import type {ComponentProps} from 'react';
import {cx} from './cx';
import s from './Button.module.css';

type Props=ComponentProps<'button'>&{variant?:'primary'|'secondary'|'text'|'link'};

export function Button({variant='secondary',type='button',className,...rest}:Props){
 return <button {...rest} type={type} className={cx(s.button,s[variant],className)}/>;
}
