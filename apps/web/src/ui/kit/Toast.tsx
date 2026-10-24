import s from './Toast.module.css';

export interface ToastAction{label:string;onClick:()=>void}

/**
 * A polite live region. Keep it mounted with `message={null}` between toasts,
 * so screen readers announce each new message.
 */
export function Toast({message,action}:{message:string|null;action?:ToastAction}){
 return <div role="status" aria-live="polite" className={s.region}>
  {message&&<div className={s.toast}>
   <span>{message}</span>
   {action&&<button type="button" className={s.action} onClick={action.onClick}>{action.label}</button>}
  </div>}
 </div>;
}
