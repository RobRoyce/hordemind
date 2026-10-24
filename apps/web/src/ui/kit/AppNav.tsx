import s from './AppNav.module.css';

interface Props{
 items:readonly {id:string;label:string}[];
 current:string;
 onSelect:(id:string)=>void;
 /** Save and sync state, kept short for phones. */
 status:string;
 sourceUrl:string;
}

/** The top bar. Below 700px its tabs move to a fixed bar at the bottom of the screen. */
export function AppNav({items,current,onSelect,status,sourceUrl}:Props){
 return <header className={s.bar}>
  <span className={s.word}>HordeMind</span>
  <nav aria-label="Main navigation" className={s.nav}>
   {items.map(item=><button key={item.id} type="button" aria-current={item.id===current?'page':undefined} className={s.item} onClick={()=>onSelect(item.id)}>{item.label}</button>)}
  </nav>
  <div className={s.meta}>
   <span>{status}</span>
   <a className={s.source} href={sourceUrl} target="_blank" rel="noreferrer">Source</a>
  </div>
 </header>;
}
