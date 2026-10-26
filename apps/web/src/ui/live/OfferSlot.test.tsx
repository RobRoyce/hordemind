import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Estimate,OfferAssessment} from '../../recommendation/model';
import {OfferSlot} from './OfferSlot';

const estimate:Estimate={
 offer:'The Burning Rain',modeled:true,mean:120,low:40,high:190,components:{} as Estimate['components'],
 reasons:['Mostly from Hellfire (+140) over 10 waves.'],assumptions:[],sensitivity:[],synergies:[]
};

const row=(assessment:OfferAssessment|null,pact=false,text='The Burning Rain')=>renderToStaticMarkup(<OfferSlot index={1}
 slot={{text,offer:text||null,unlisted:false}} picker={null} pact={pact}
 selected={false} best={false} busy={false} assessment={assessment} reportContext="" removable={false}
 onSelect={()=>{}} onClear={()=>{}}/>);

describe('offer row details',()=>{
 it('a row with an estimate offers a Details link named for its offer',()=>{
  expect(row(estimate)).toMatch(/<button[^>]*aria-label="Details for The Burning Rain"[^>]*>Details<\/button>/);
 });
 it('an unmodeled offer gets a Details link too',()=>{
  expect(row({offer:'The Burning Rain',modeled:false,reason:'Not simulated yet.'})).toContain('aria-label="Details for The Burning Rain"');
 });
 it('the number stays clickable but leaves the Tab order to the Details link',()=>{
  expect(row(estimate)).toMatch(/<button[^>]*tabindex="-1"[^>]*>\+120<\/button>/);
 });
 it('a row still waiting for its estimate has no Details link',()=>{
  expect(row(null)).not.toContain('Details');
 });
});

describe('the Black Pact row',()=>{
 it('clears its offer but never removes the row',()=>{
  expect(row(null,true)).toContain('aria-label="Clear the Black Pact offer"');
 });
 it('shows no clear button while empty',()=>{
  expect(row(null,true,'')).not.toContain('Clear the Black Pact offer');
 });
});
