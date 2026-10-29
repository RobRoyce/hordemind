import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WarPlanDetail,WarPlanTree} from './WarPlanTree';

const tree=(learned:string[])=>renderToStaticMarkup(<WarPlanTree learned={learned} onToggle={()=>{}}/>);

describe('WarPlanTree',()=>{
 it('asks desktop users to hover or focus an upgrade',()=>
  expect(tree([])).toContain('Hover or focus an upgrade to read its in-game tooltip and how HordeMind uses it.'));
 it('names locked and excluded upgrades in its legend',()=>expect(tree([])).toContain('>Locked or excluded</li>'));
 it('says how to fix an upgrade saved without a path',()=>expect(tree(['Council Coffers'])).toContain(
  'Saved before HordeMind followed the tree: Council Coffers. Learn an upgrade that connects it to the top node, or unlearn it.'));
 it('says learning an excluded upgrade swaps it with its partner',()=>
  expect(renderToStaticMarkup(<WarPlanDetail id="Total Chaos" learned={['Method and Madness','Reign in Hell']}/>))
   .toContain('Excluded while Reign in Hell is learned. Learning it swaps them.'));
});
