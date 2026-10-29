import {useLayoutEffect,useState,type RefObject} from 'react';

/** Width used before the first measurement and in server rendering. */
export const DEFAULT_WIDTH=640;
/** Charts narrower than this use the phone layout. */
export const NARROW_BELOW=480;

/** The element's rendered width, kept current by a ResizeObserver. */
export function useChartWidth(ref:RefObject<HTMLElement|null>):number{
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
