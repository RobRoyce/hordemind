import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newProfile} from '../../domain/run';
import {CharacterForm} from './CharacterForm';
import {LairBossBlock} from './LairBossBlock';
import {SplinterBlock} from './SplinterBlock';

describe('SplinterBlock',()=>{
 const profile=(patch:object)=>({...newProfile('A','Paladin'),...patch});
 const ranks=(terror:number)=>({terror,destruction:null,hatred:null});
 const render=(patch:object)=>renderToStaticMarkup(<SplinterBlock profile={profile(patch)} onUpdate={()=>{}} help="Splinter help."/>);
 it('sits in the character settings',()=>{
  const html=renderToStaticMarkup(<CharacterForm profile={profile({activeSplinter:'terror',splinterRanks:ranks(14)})} onUpdate={()=>null}/>);
  expect(html).toContain('Active splinter');
  expect(html).toContain('Splinter of Terror rank');
 });
 it('Terror active shows only Terror bonuses',()=>{
  const html=render({activeSplinter:'terror',splinterRanks:ranks(5)});
  expect(html).toContain('Cult of Annihilation</b>, first node of the events branch');
  expect(html).not.toContain('Lair of Runes');
  expect(html).toContain('Splinter of Terror rank');
 });
 it('Hatred active says it has no Hordes bonus',()=>{
  const html=render({activeSplinter:'hatred',splinterRanks:{terror:null,destruction:null,hatred:5}});
  expect(html).toContain('No Infernal Hordes bonus.');
  expect(html).not.toContain('Rank 5:');
  expect(html).toContain('Splinter of Hatred rank');
 });
 it('no active splinter shows a prompt and no rank field',()=>{
  const html=render({});
  expect(html).toContain('Pick the splinter you have active to enter its rank.');
  expect(html).not.toContain('type="number"');
 });
 it("the field shows the active splinter's saved rank",()=>{
  const html=render({activeSplinter:'destruction',splinterRanks:{terror:20,destruction:14,hatred:null}});
  expect(html).toContain('Splinter of Destruction rank');
  expect(html).toContain('value="14"');
  expect(html).not.toContain('value="20"');
 });
 it('an unlearned bonus says to learn the node',()=>{
  const p={activeSplinter:'terror' as const,splinterRanks:ranks(14)};
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
