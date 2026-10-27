import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Checkbox} from './Field';

describe('Checkbox',()=>{
 it('passes describedBy to aria-describedby',()=>{
  const html=renderToStaticMarkup(<Checkbox label="A" checked={false} onChange={()=>{}} describedBy="why"/>);
  expect(html).toContain('aria-describedby="why"');
 });
 it('omits aria-describedby when not given',()=>{
  expect(renderToStaticMarkup(<Checkbox label="A" checked onChange={()=>{}}/>)).not.toContain('aria-describedby');
 });
});
