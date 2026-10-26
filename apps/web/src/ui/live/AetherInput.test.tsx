import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {AetherInput} from './AetherInput';

const wire={id:'aether',invalid:false};
const field=(props:{missed?:boolean;onMissed?:(missed:boolean)=>void})=>renderToStaticMarkup(<AetherInput wire={wire}
 value="85" onChange={()=>{}} missed={props.missed??false} {...(props.onMissed?{onMissed:props.onMissed}:{})}/>);
const numberInput=(html:string)=>html.match(/<input type="number"[^>]*>/)?.[0]??'';
const missedBox=(html:string)=>html.match(/<input type="checkbox"[^>]*>/)?.[0]??'';

describe('an Aether reading',()=>{
 it('is required and editable while the player has it',()=>{
  const html=field({onMissed:()=>{}});
  expect(numberInput(html)).toContain('required');
  expect(numberInput(html)).not.toContain('disabled');
  expect(numberInput(html)).toContain('value="85"');
  expect(missedBox(html)).not.toContain('checked');
 });
 it('clears and locks once marked missed',()=>{
  const html=field({missed:true,onMissed:()=>{}});
  expect(numberInput(html)).toContain('disabled');
  expect(numberInput(html)).toContain('placeholder="Not read"');
  expect(numberInput(html)).toContain('value=""');
  expect(missedBox(html)).toContain('checked');
 });
 it('offers Missed it only where the reading is required',()=>{
  const html=field({});
  expect(html).not.toContain('Missed it');
  expect(numberInput(html)).not.toContain('required');
 });
});
