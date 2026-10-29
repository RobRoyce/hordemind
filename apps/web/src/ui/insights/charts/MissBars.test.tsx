import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReportCard} from '../../../analysis/reportCard';
import {MissBars,missLayout} from './MissBars';

const fam=(family:ReportCard['byFamily'][number]['family'],readings:number,inRange:number,averageMiss:number):ReportCard['byFamily'][number]=>
 ({family,stats:{readings,inRange,averageMiss}});
const families=[fam('Masses',12,6,36.4),fam('Spires',8,5,-22.2),fam('Lords',5,4,2)];
const html=(el:React.ReactElement)=>renderToStaticMarkup(el).replaceAll('&#x27;',"'");

describe('MissBars',()=>{
 it('renders nothing without families',()=>expect(html(<MissBars families={[]}/>)).toBe(''));
 it('draws one bar per family, in order, each with its miss text',()=>{
  const out=html(<MissBars families={families}/>);
  expect(out.match(/data-side=/g)).toHaveLength(3);
  for(const t of ['36 too much','22 too little','about right'])expect(out).toContain(`>${t}<`);
  expect(out.indexOf('Masses')).toBeLessThan(out.indexOf('Spires'));
  expect(out).toContain('12 readings');
 });
 it('draws a positive miss right of centre and a negative one left',()=>{
  const out=html(<MissBars families={families}/>);
  expect([...out.matchAll(/data-side="(\w+)"/g)].map(m=>m[1])).toEqual(['right','left','right']);
 });
 it('says the numbers without hovering',()=>{
  expect(html(<MissBars families={families}/>)).toContain('36 too much per reading. After Masses offers. 12 readings, 50% inside the range');
 });
 it('switches to stacked rows below 480 px and keeps the longest bar clear of its label',()=>{
  expect(missLayout(families,640).narrow).toBe(false);
  const n=missLayout(families,390);
  expect(n).toMatchObject({narrow:true,left:0,row:52});
  const w=missLayout(families,640);
  expect(40*w.scale+84).toBeCloseTo((640-w.left-8)/2);
 });
});
