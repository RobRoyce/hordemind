import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {analyze} from '../../analysis/analyze';
import {ChoicesSection} from './ChoicesSection';
import {GameNumbersSection} from './GameNumbersSection';
import {ReportCardSection} from './ReportCardSection';
import {needsText} from './insightsText';

const empty=analyze([],'p1',20);
const html=(el:React.ReactElement)=>renderToStaticMarkup(el).replaceAll('&#x27;',"'");

describe('empty states',()=>{
 it('ask for a character when none is selected',()=>{
  expect(html(<ReportCardSection name={null} analysis={null}/>)).toContain('Choose a character on the Character screen to see its report card.');
  expect(html(<ChoicesSection name={null} overrides={null} allMiss={null}/>)).toContain('Choose a character on the Character screen to see its choices.');
 });
 it('ask for 3 runs when a character has none',()=>{
  expect(html(<ReportCardSection name="Rob" analysis={empty.character}/>)).toContain(needsText(3));
  expect(needsText(3)).toBe('Record 3 more runs with at least 3 Aether readings to see the report card.');
 });
 it('say so when a character has no recommended choices',()=>{
  const out=html(<ChoicesSection name="Rob" overrides={empty.character!.overrides} allMiss={null}/>);
  expect(out).toContain('Choices you record in Live Run while a recommendation is showing appear here.');
  expect(out).not.toContain('Took another offer');
 });
 it('say so when counts hold no offer sets',()=>{
  const out=html(<GameNumbersSection counts={empty.counts}/>);
  expect(out).toContain('Record offer sets in Live Run to see these counts.');
  expect(out).not.toContain('How often each offer appeared');
 });
});
