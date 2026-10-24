import {describe,expect,it} from 'vitest';
import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppNav} from './AppNav';
import {Sheet} from './Sheet';

const html=(el:ReactElement)=>renderToStaticMarkup(el);
const ITEMS=[{id:'character',label:'Character'},{id:'run',label:'Live Run'}];

describe('Sheet and AppNav',()=>{
 it('marks the current section',()=>{
  const out=html(<AppNav items={ITEMS} current="run" onSelect={()=>{}} status="Saved" sourceUrl="x"/>);
  expect(out).toContain('aria-label="Main navigation"');
  expect(out).toMatch(/aria-current="page"[^>]*>Live Run/);
  expect(out.match(/aria-current/g)).toHaveLength(1);
  expect(out).toContain('HordeMind');
 });
 it('a closed sheet renders nothing',()=>expect(html(<Sheet open={false} title="t" onClose={()=>{}}>x</Sheet>)).toBe(''));
 it('a wide sheet is an inline group with a close button',()=>{
  const out=html(<Sheet open title="Offer 1 of 3" onClose={()=>{}}>x</Sheet>);
  expect(out).toMatch(/role="group"[^>]*aria-label="Offer 1 of 3"/);
  expect(out).not.toContain('aria-modal');
  expect(out).toMatch(/<button[^>]*>Close<\/button>/);
 });
});
