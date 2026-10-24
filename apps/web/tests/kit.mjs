import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {checkGraph} from './geometry.mjs';

// GitHub Ubuntu runners ship Chrome; avoid downloading browser binaries on every PR.
const browser=await chromium.launch({
 headless:true,
 ...(process.env.E2E_CHROMIUM_EXECUTABLE
   ? {executablePath:process.env.E2E_CHROMIUM_EXECUTABLE}
   : process.env.E2E_BUNDLED_CHROMIUM==='1' ? {} : {channel:'chrome'})
});
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:5173/';
const step=name=>console.log('  ·',name);

async function noSeriousViolations(page,context){
 // Scan the resting state: a sheet mid-entrance is still fading in.
 await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
 const {violations}=await new AxeBuilder({page}).analyze();
 const serious=violations.filter(v=>v.impact==='serious'||v.impact==='critical')
  .map(v=>`${v.id} (${v.impact}): ${v.nodes.map(n=>n.target.join(' ')).join(', ')}`);
 assert.deepEqual(serious,[],`axe violations ${context}`);
}

async function check(viewport){
 const context=await browser.newContext({viewport});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 const focusedIn=selector=>page.evaluate(s=>Boolean(document.activeElement?.closest(s)),selector);
 try{
  const response=await page.goto(base+'kit.html',{waitUntil:'domcontentloaded'});
  assert(response?.ok(),'kit.html is served');
  await page.getByRole('heading',{level:1,name:'HordeMind kit'}).waitFor({timeout:5000});

  step('axe finds no serious or critical violations');
  await noSeriousViolations(page,'on the gallery');

  step('arrow keys move the segmented choice');
  const realm=page.getByRole('radiogroup',{name:'Realm'});
  const checked=realm.getByRole('radio',{checked:true});
  const first=await checked.innerText();
  await checked.focus();
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await checked.innerText(),first,'ArrowRight checks the next option');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-checked')),'true','focus follows the checked option');

  step('the help toggle reveals its tip');
  const help=page.getByRole('button',{name:'Help: Character name'});
  assert.equal(await help.getAttribute('aria-expanded'),'false');
  await help.click();
  assert.equal(await help.getAttribute('aria-expanded'),'true');
  await page.getByText('Keep separate profiles for different builds.').waitFor({state:'visible'});

  step('arrow keys move between War Plan nodes');
  await page.getByRole('button',{name:'Method and Madness',exact:true}).focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Impending Doom');

  step('War Plan connectors cross no label or node, and nothing overlaps');
  for(const name of ['Offers and Chaos','Aether events']){
   const {crossings,overlaps}=await checkGraph(page,page.getByRole('group',{name,exact:true}));
   assert.deepEqual(crossings,[],`${name} crossings`);
   assert.deepEqual(overlaps,[],`${name} overlaps`);
  }

  if(viewport.width<700){
   step('the phone sheet traps focus, closes on Escape and returns focus');
   const opener=page.getByRole('button',{name:'Open the sheet'});
   await opener.click();
   const dialog=page.getByRole('dialog',{name:'Offer 2 of 3'});
   await dialog.waitFor();
   assert(await focusedIn('[role="dialog"]'),'opening moves focus inside');
   for(let i=1;i<=20;i++){
    await page.keyboard.press('Tab');
    assert(await focusedIn('[role="dialog"]'),`Tab ${i} stays inside`);
   }
   await page.keyboard.press('Shift+Tab');
   assert(await focusedIn('[role="dialog"]'),'Shift+Tab stays inside');
   await noSeriousViolations(page,'with the sheet open');
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'detached'});
   assert(await opener.evaluate(el=>el===document.activeElement),'focus returns to the opener');
  }

  assert.deepEqual(errors,[],'Browser emitted errors');
 }finally{await context.close()}
}

try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  console.log(`${viewport.width}×${viewport.height}`);
  await check(viewport);
 }
 console.log('kit checks passed');
}finally{await browser.close()}
