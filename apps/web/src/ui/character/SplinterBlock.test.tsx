import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newProfile} from '../../domain/run';
import {LairBossBlock} from './LairBossBlock';
import {SplinterBlock} from './SplinterBlock';

describe('SplinterBlock',()=>{
 it('inactive splinters say their bonuses apply while active, and Hatred says it has none',()=>{
  const html=renderToStaticMarkup(<SplinterBlock profile={{...newProfile('A','Paladin'),activeSplinter:'terror',splinterRanks:{terror:5,destruction:20,hatred:null}}} onUpdate={()=>{}}/>);
  expect(html).toContain('Applies while active');
  expect(html).toContain('No Infernal Hordes bonus.');
  expect(html).toContain('First node of the events branch in the Infernal Hordes War Plan');
 });
 it('LairBossBlock lists every node with its Aether note',()=>{
  const html=renderToStaticMarkup(<LairBossBlock profile={newProfile('A','Paladin')} onUpdate={()=>null}/>);
  expect(html).toContain('Infernal Deception');
  expect(html).toContain('No effect on Aether.');
  expect(html).toContain('Its effect on Chaos Wave Aether is unknown.');
 });
});
