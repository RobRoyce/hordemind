import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {OfferBars} from './OfferBars';

const names=['The Teeming Masses','The Bursting Masses','The Hungry Spires','The Rising Spires','The Gorging Mass','The Exalted Hordes','The Aether Rush','The Swarming Fiends','The Chaotic Offering','The Wanderer Enfeebled','The Grim Tide','The Last Offer'];
const some=(sets:number)=>({sets,counts:names.map((offer,i)=>({offer,count:Math.max(1,sets-i*3)}))});
const none={sets:0,counts:[]};
const html=(el:React.ReactElement)=>renderToStaticMarkup(el).replaceAll('&#x27;',"'");

describe('OfferBars',()=>{
 it('shows at most 10 rows',()=>{
  expect(html(<OfferBars offers={{neither:some(40),chaos:none,reign:none}}/>).match(/data-bar=/g)).toHaveLength(10);
 });
 it('has no setup toggle with one setup',()=>{
  const out=html(<OfferBars offers={{neither:some(40),chaos:none,reign:none}}/>);
  expect(out).not.toContain('radiogroup');
  expect(out).toContain('With neither Reign in Hell nor Total Chaos (40 offer sets)');
 });
 it('offers a toggle with two setups and starts on the larger one',()=>{
  const out=html(<OfferBars offers={{neither:some(10),chaos:some(40),reign:none}}/>);
  expect(out).toContain('role="radiogroup"');
  expect(out).toMatch(/aria-checked="true"[^>]*>Total Chaos/);
  expect(out).toContain('40 offer sets');
  expect(out).toContain('Reign in Hell and Total Chaos sit in the second row of the offers branch in the Infernal Hordes War Plan.');
 });
 it("shows each row's percent and says it without hovering",()=>{
  const out=html(<OfferBars offers={{neither:some(40),chaos:none,reign:none}}/>);
  expect(out).toContain('>100%<');
  expect(out).toContain('>93%<');
  expect(out).toContain('100% of 40 offer sets. The Teeming Masses. Appeared 40 times');
 });
 it('renders nothing when no setup has sets',()=>expect(html(<OfferBars offers={{neither:none,chaos:none,reign:none}}/>)).toBe(''));
});
