/** Accessible hover + keyboard-focus help for setup fields. */
export function Help({message}:{message:string}){
 return <span className="field-help" tabIndex={0} role="note" aria-label={message}>
  <span aria-hidden="true">?</span>
  <span className="help-popup">{message}</span>
 </span>;
}
