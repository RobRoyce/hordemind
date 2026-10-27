import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newProfile} from '../../domain/run';
import {LairBossBlock} from './LairBossBlock';
import {SplinterBlock} from './SplinterBlock';

describe('SplinterBlock',()=>{
 const profile=(patch:object)=>({...newProfile('A','Paladin'),...patch});
 const render=(patch:object)=>renderToStaticMarkup(<SplinterBlock profile={profile(patch)} onUpdate={()=>{}}/>);
 it('Terror active shows only Terror bonuses',()=>{
  const html=render({activeSplinter:'terror',splinterRank:5});
  expect(html).toContain('Cult of Annihilation</b>, first node of the events branch');
  expect(html).not.toContain('Lair of Runes');
  expect(html).toContain('Splinter rank');
 });
 it('Hatred active says it has no Hordes bonus',()=>{
  const html=render({activeSplinter:'hatred',splinterRank:5});
  expect(html).toContain('No Infernal Hordes bonus.');
  expect(html).not.toContain('Rank 5:');
  expect(html).toContain('Splinter rank');
 });
 it('no active splinter shows a prompt and no rank field',()=>{
  const html=render({});
  expect(html).toContain('Pick the splinter you have active to enter its rank.');
  expect(html).not.toContain('Splinter rank');
 });
 it('an unlearned bonus says to learn the node',()=>{
  const p={activeSplinter:'terror' as const,splinterRank:14};
  const html=render(p);
  expect(html).toContain('Learn Impending Doom to use it.');
  expect(html).not.toContain('Included in estimates.');
  expect(render({...p,warPlanNodes:['Impending Doom']})).toContain('Included in estimates.');
 });
 it('LairBossBlock lists every node with its Aether note',()=>{
  const html=renderToStaticMarkup(<LairBossBlock profile={newProfile('A','Paladin')} onUpdate={()=>null}/>);
  expect(html).toContain('Infernal Deception');
  expect(html).toContain('No effect on Aether.');
  expect(html).toContain('Its effect on Chaos Wave Aether is unknown.');
  const [,ref]=/aria-describedby="([^"]+)"/.exec(html)!;
  expect(html).toContain(`id="${ref}"`);
 });
});
