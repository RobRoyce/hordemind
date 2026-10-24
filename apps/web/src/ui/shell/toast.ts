import type {ToastAction} from '../kit';

/** Long enough to notice a mis-tap and undo it. */
export const ACTION_TOAST_MS=8000;
export const PLAIN_TOAST_MS=2600;

export interface ToastState{message:string;action?:ToastAction;ms:number}

/** The toast to show next. It replaces whatever toast is showing. */
export function nextToast(message:string,action?:ToastAction):ToastState{
 return action?{message,action,ms:ACTION_TOAST_MS}:{message,ms:PLAIN_TOAST_MS};
}
