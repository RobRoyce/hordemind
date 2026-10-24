import {describe,expect,it} from 'vitest';
import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import css from './tokens.css?raw';
import type {OfferFamily} from '../../catalog';
import {CategoryMark,familySlug} from './CategoryMark';
import {Notice} from './Notice';
import {Numeral} from './Numeral';
import {WaveTrack} from './WaveTrack';
import {Toast} from './Toast';
import {Frame} from './Frame';
import {DangerMark} from './DangerMark';

const html=(el:ReactElement)=>renderToStaticMarkup(el);

// catalog.ts exports FAMILY_ORDER only from Task 10 on.
const FAMILY_ORDER_LOCAL:readonly OfferFamily[]=['Masses','Spires','Hellborne','Fiends','Lords','Monsters','Hellfire','Player boon','Player bane','Council','Special boss','Chaos'];

describe('structure components and game marks',()=>{
 it('every offer family has a pigment token',()=>{
  for(const f of FAMILY_ORDER_LOCAL)expect(css,f).toContain(`--hm-fam-${familySlug(f)}:`);
 });
 it('player boons and banes share a pigment',()=>{
  expect(familySlug('Player boon')).toBe('player');
  expect(familySlug('Player bane')).toBe('player');
  expect(familySlug('Special boss')).toBe('special');
 });
 it('unlisted offers get a mark',()=>expect(html(<CategoryMark family={null}/>)).toContain('Unlisted'));
 it('a label replaces the category name beside the pigment',()=>{
  const out=html(<CategoryMark family="Masses" label="The Puffing Masses"/>);
  expect(out).toContain('The Puffing Masses');
  expect(out).toContain('--hm-fam-masses');
 });
 it('errors are alerts',()=>expect(html(<Notice tone="error">x</Notice>)).toContain('role="alert"'));
 it('other notices are notes',()=>expect(html(<Notice tone="info" label="Black Pact advice">x</Notice>)).toMatch(/role="note"[^>]*aria-label="Black Pact advice"|aria-label="Black Pact advice"[^>]*role="note"/));
 it('missing numbers show a dash',()=>expect(html(<Numeral label="Aether" value={null}/>)).toContain('—'));
 it('wave track names each wave',()=>{
  const out=html(<WaveTrack total={4} taken={['The Puffing Masses']} deciding/>);
  expect(out.match(/<li/g)).toHaveLength(4);
  expect(out).toContain('Wave 1: The Puffing Masses');
  expect(out).toContain('Wave 2: deciding now');
  expect(out).toContain('Wave 3: not yet');
 });
 it('toast exposes its action',()=>expect(html(<Toast message="m" action={{label:'Undo',onClick:()=>{}}}/>)).toMatch(/<button[^>]*>Undo</));
 it('the frame is a named region',()=>expect(html(<Frame label="Recommendation">x</Frame>)).toMatch(/<section[^>]*aria-label="Recommendation"/));
 it('danger marks explain themselves',()=>{
  const out=html(<DangerMark danger={{level:'high',why:'Elites explode'}}/>);
  expect(out).toContain('High danger');
  expect(out).toContain('title="Elites explode"');
 });
});
