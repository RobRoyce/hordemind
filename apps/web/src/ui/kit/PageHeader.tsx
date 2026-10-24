import s from './PageHeader.module.css';

export function PageHeader({title,lead}:{title:string;lead?:string}){
 return <header className={s.header}>
  <h1 className={s.title}>{title}</h1>
  {lead&&<p className={s.lead}>{lead}</p>}
 </header>;
}
