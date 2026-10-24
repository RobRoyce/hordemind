import {describe,expect,it} from 'vitest';
import css from './tokens.css?raw';

// Every component stylesheet under src/ui, read as text.
const MODULE_CSS=import.meta.glob<string>('../**/*.module.css',{query:'?raw',import:'default',eager:true});
const FAMILY_SLUGS=['masses','spires','hellborne','fiends','lords','monsters','hellfire','player','council','special','chaos'];

const tok:Record<string,string>=Object.fromEntries([...css.matchAll(/--hm-([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1]!,m[2]!]));

function luminance(hex:string){
 const [r,g,b]=[1,3,5].map(i=>{
  const c=parseInt(hex.slice(i,i+2),16)/255;
  return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;
 }) as [number,number,number];
 return 0.2126*r+0.7152*g+0.0722*b;
}
function contrast(a:string|undefined,b:string|undefined){
 if(!a||!b)return 0;
 const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x) as [number,number];
 return (hi+0.05)/(lo+0.05);
}
describe('design tokens',()=>{
 it('meets the spec contrast floors',()=>{
  for(const t of ['ink','muted','gold','amber','ember','danger'])
   for(const bg of ['bg','raised','sheet'])expect(contrast(tok[t],tok[bg]),`${t} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  for(const t of ['rubric','faint'])expect(contrast(tok[t],tok.bg),t).toBeGreaterThanOrEqual(3);
  for(const f of FAMILY_SLUGS)expect(contrast(tok['fam-'+f],tok.bg),f).toBeGreaterThanOrEqual(3);
 });
 it('keeps text legible inside the frame',()=>{
  for(const t of ['ink','muted','gold','amber','ember'])expect(contrast(tok[t],tok['frame-fill-top']),`${t} on frame top`).toBeGreaterThanOrEqual(4.5);
  for(const t of ['ink','muted','gold','amber','ember','danger'])expect(contrast(tok[t],tok['frame-fill-bottom']),`${t} on frame bottom`).toBeGreaterThanOrEqual(4.5);
 });
 it('keeps fallback font stacks',()=>{
  expect(css).toMatch(/--hm-font-display:\s*'Grenze Gotisch',\s*'Spectral',\s*Georgia,\s*serif/);
  expect(css).toMatch(/--hm-font-text:\s*'Spectral',\s*Georgia,\s*serif/);
 });
 it('component CSS uses tokens only',()=>{
  for(const [file,text] of Object.entries(MODULE_CSS)){
   expect(text,file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
   for(const m of text.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1]),file).toBeGreaterThanOrEqual(13);
  }
 });
});
