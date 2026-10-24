import {describe,expect,it} from 'vitest';
import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Button} from './Button';
import {Field} from './Field';
import {Segmented} from './Segmented';

const html=(el:ReactElement)=>renderToStaticMarkup(el);
const REALMS=[{value:'Season 15',label:'Season 15'},{value:'Eternal',label:'Eternal'}] as const;

describe('action and field components',()=>{
 it('Button defaults to type=button',()=>expect(html(<Button>Go</Button>)).toContain('type="button"'));
 it('Field wires label, hint and error',()=>{
  const out=html(<Field label="Mobility" hint="h" error="e">{w=><input id={w.id} aria-describedby={w.describedBy} aria-invalid={w.invalid}/>}</Field>);
  const id=/for="([^"]+)"/.exec(out)![1];
  expect(out).toContain(`id="${id}"`);
  expect(out).toMatch(/aria-describedby="[^"]+ [^"]+"/);
  expect(out).toContain('aria-invalid="true"');
 });
 it('help starts collapsed',()=>{
  const out=html(<Field label="Realm" help="tip">{()=>null}</Field>);
  expect(out).toMatch(/<button[^>]*aria-label="Help: Realm"[^>]*>/);
  expect(out).toMatch(/<button[^>]*aria-expanded="false"[^>]*>/);
  const tipId=/aria-controls="([^"]+)"/.exec(out)![1];
  expect(out).toMatch(new RegExp(`<p[^>]*id="${tipId}"[^>]*hidden`));
 });
 it('Segmented checks exactly one radio',()=>{
  const out=html(<Segmented label="Realm" value="Eternal" options={REALMS} onChange={()=>{}}/>);
  expect(out).toContain('role="radiogroup"');
  expect(out.match(/aria-checked="true"/g)).toHaveLength(1);
 });
 it('Segmented keeps only the checked radio in the tab order',()=>{
  const out=html(<Segmented label="Realm" value="Eternal" options={REALMS} onChange={()=>{}}/>);
  expect(out.match(/tabindex="0"/g)).toHaveLength(1);
  expect(out).toMatch(/aria-checked="true"[^>]*tabindex="0"[^>]*>Eternal/);
 });
});
