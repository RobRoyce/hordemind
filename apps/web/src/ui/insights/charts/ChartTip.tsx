import {useLayoutEffect,useRef,useState} from 'react';
import s from './charts.module.css';

export interface TipState{x:number;y:number;lines:string[]}

/**
 * Tooltip state shared by the charts. `hit(lines,x,y)` returns the props for a
 * transparent hit area; `x,y` is where the tip points, in chart coordinates.
 */
export function useTip(){
 const [tip,setTip]=useState<TipState|null>(null);
 const hit=(lines:string[],x:number,y:number)=>{
  const show=()=>setTip({x,y,lines});
  return {tabIndex:0,role:'img',className:s.hit,'aria-label':lines.join('. '),
   onPointerEnter:show,onFocus:show,onPointerLeave:()=>setTip(null),onBlur:()=>setTip(null)};
 };
 return {tip,hit,clear:()=>setTip(null)};
}

/** A tooltip centred over its mark and clamped inside the chart wrapper. */
export function ChartTip({tip,width}:{tip:TipState|null;width:number}){
 const ref=useRef<HTMLDivElement>(null);
 const [box,setBox]=useState({w:0,h:0});
 useLayoutEffect(()=>{
  const el=ref.current;
  if(el)setBox(b=>b.w===el.offsetWidth&&b.h===el.offsetHeight?b:{w:el.offsetWidth,h:el.offsetHeight});
 });
 if(!tip)return null;
 const left=Math.min(Math.max(tip.x-box.w/2,0),Math.max(0,width-box.w));
 const above=tip.y-box.h-8;
 const [first,...rest]=tip.lines;
 return <div ref={ref} className={s.tip} style={{left,top:above>=0?above:tip.y+16}} aria-hidden="true">
  <div className={s.tipFirst}>{first}</div>
  {rest.map(l=><div key={l}>{l}</div>)}
 </div>;
}
