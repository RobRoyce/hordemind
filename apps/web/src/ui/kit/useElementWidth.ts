import {useLayoutEffect,useState,type RefObject} from 'react';

/** Width used before the first measurement and in server rendering. */
const DEFAULT_WIDTH=640;

/** The element's rendered width, kept current by a ResizeObserver. */
export function useElementWidth(ref:RefObject<HTMLElement|null>):number{
 const [width,setWidth]=useState(DEFAULT_WIDTH);
 useLayoutEffect(()=>{
  const el=ref.current;
  if(!el)return;
  const measure=()=>{
   const w=Math.round(el.getBoundingClientRect().width);
   if(w>0)setWidth(w);
  };
  measure();
  if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(measure);
  observer.observe(el);
  return ()=>observer.disconnect();
 },[ref]);
 return width;
}
