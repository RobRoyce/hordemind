import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkGraph} from './geometry.mjs';
import AxeBuilder from '@axe-core/playwright';

// GitHub Ubuntu runners ship Chrome; avoid downloading browser binaries on every PR.
const browser=await chromium.launch({
 headless:true,
 ...(process.env.E2E_CHROMIUM_EXECUTABLE
   ? {executablePath:process.env.E2E_CHROMIUM_EXECUTABLE}
   : process.env.E2E_BUNDLED_CHROMIUM==='1' ? {} : {channel:'chrome'})
});
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:5173/';
const step=name=>console.log('  ·',name);

// Elements are found by role and accessible name, so the same journey runs on old and new screens.

/** A setting is a native select or a radiogroup of radios; both answer to the setting's label. */
async function noSeriousViolations(page,context){
 // Scan the resting state: sheets and toasts animate in.
 await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
 const {violations}=await new AxeBuilder({page}).analyze();
 const serious=violations.filter(v=>v.impact==='serious'||v.impact==='critical')
  .map(v=>`${v.id} (${v.impact}): ${v.nodes.map(n=>n.target.join(' ')).join(', ')}`);
 // axe finishes its run in a blank page, which leaves this one in the background, where Chrome throttles timers.
 await page.bringToFront();
 assert.deepEqual(serious,[],`axe violations on ${context}`);
}
/** iPhone Safari zooms the page when a text field under 16px takes focus. */
async function noZoomingFields(page,context){
 if(page.viewportSize().width>=700)return;
 const small=await page.evaluate(()=>[...document.querySelectorAll('input,select,textarea')]
  .filter(el=>el.getClientRects().length>0&&!['checkbox','radio','button','submit','range','hidden'].includes(el.type))
  .map(el=>({name:el.getAttribute('aria-label')||el.labels?.[0]?.textContent||el.tagName,size:parseFloat(getComputedStyle(el).fontSize)}))
  .filter(f=>f.size<16).map(f=>`${f.name} (${f.size}px)`));
 assert.deepEqual(small,[],`text fields under 16px on ${context}`);
}
async function settingControl(page,label){
 const exact=typeof label==='string';
 const group=page.getByRole('radiogroup',{name:label,exact});
 const select=page.getByRole('combobox',{name:label,exact});
 await group.or(select).first().waitFor();
 return await group.count()?{group}:{select};
}
async function setChoice(page,label,optionLabel){
 const c=await settingControl(page,label);
 if(c.group)await c.group.getByRole('radio',{name:optionLabel,exact:true}).click();
 else await c.select.selectOption({label:optionLabel});
}
async function choiceOf(page,label){
 const c=await settingControl(page,label);
 if(c.group)return (await c.group.getByRole('radio',{checked:true}).innerText()).trim();
 return c.select.evaluate(s=>s.selectedOptions[0]?.label??'');
}
const navTo=(page,name)=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name}).click();

async function journey(viewport){
 const context=await browser.newContext({viewport,acceptDownloads:true});
 // Real time until a step pauses it.
 await context.clock.install();
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hordemind-v2-local-v1')));
 const offer=n=>page.getByRole('combobox',{name:`Offer ${n}`});
 const estimates=()=>page.getByLabel(/^Estimate for /);
 const decisionHeading=()=>page.getByRole('heading',{name:/Offers before wave/});
 const chosenEvents=async()=>(await stored()).runs[0].events.filter(e=>e.type==='offer_chosen');
 async function pick(n,query,label){
  await offer(n).fill(query);
  await page.getByRole('option',{name:new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).first().waitFor();
  await offer(n).press('Enter');
  assert.equal(await offer(n).inputValue(),label);
 }

 try{
  await page.goto(base+'#strategy',{waitUntil:'domcontentloaded'});

  step('create a Paladin and configure it without any save button');
  await page.getByLabel('Character name',{exact:true}).fill('CI Paladin');
  await page.getByRole('button',{name:'Create character'}).click();
  await setChoice(page,'Difficulty','Torment XII');
  await setChoice(page,'Realm','Eternal');
  await page.getByLabel('Build',{exact:true}).fill('Blessed Shield');
  await setChoice(page,/Elite (\/|and) Lord clear speed/,'Fast');
  await setChoice(page,'Mobility','Low');
  const warPlan=name=>page.getByRole('button',{name,exact:true});
  // Locked upgrades are aria-disabled; force the click to prove it is ignored.
  await warPlan('The Black Pact').click({force:true});
  assert.equal(await warPlan('The Black Pact').getAttribute('aria-pressed'),'false','locked upgrades cannot be learned');
  for(const name of ['Method and Madness','Impending Doom','The Black Pact'])await warPlan(name).click();
  assert.equal(await warPlan('The Black Pact').getAttribute('aria-pressed'),'true');
  assert((await page.getByRole('region',{name:'Upgrade details'}).innerText()).includes('An ominous altar appears between waves'));
  const {crossings,overlaps}=await checkGraph(page,page.getByRole('group',{name:'War Plan',exact:true}));
  assert.deepEqual(crossings,[],'War Plan connectors cross no label or node');
  assert.deepEqual(overlaps,[],'War Plan nodes and labels never overlap');
  await noSeriousViolations(page,'Character');
  await noZoomingFields(page,'Character');

  step('a malformed build link is rejected inline and never blocks saving');
  await page.getByLabel('Build planner link',{exact:true}).fill('not a link');
  await page.getByText('does not look like a web address').waitFor();
  await page.getByLabel('Build planner link',{exact:true}).fill('maxroll.gg/d4/planner/ci');
  const profile=(await stored()).profiles[0];
  assert.equal(profile.buildUrl,'https://maxroll.gg/d4/planner/ci');
  assert.equal(profile.mobility,'low');
  assert.equal(profile.specialOfferingAvailable,true,'The Black Pact enables the special offer');

  step('configuration survives navigation and reload');
  await navTo(page,/^Live Run/);
  await page.getByRole('button',{name:/^Start (run|a \d+-wave run)$/}).waitFor();
  assert((await page.getByLabel('Character summary').innerText()).includes('The Black Pact'));
  await page.reload({waitUntil:'domcontentloaded'});
  await navTo(page,/^(Strategy Lab|Character)/);
  assert.equal(await choiceOf(page,'Difficulty'),'Torment XII');
  assert.equal(await choiceOf(page,'Mobility'),'Low');
  assert.equal(await choiceOf(page,'Realm'),'Eternal');

  // A second tab opened now holds this state while the first tab records a run.
  const other=await context.newPage();
  await other.goto(base+'#strategy',{waitUntil:'domcontentloaded'});
  await other.getByLabel('Build',{exact:true}).waitFor();
  // Chrome throttles an unfocused tab's timers, which delays the recommender's debounce by seconds.
  await page.bringToFront();

  step('start a run: the first offer comes before wave 1');
  await page.getByRole('button',{name:/^Start (live run|a \d+-wave run)$/}).click();
  await page.getByRole('heading',{name:'Offers before wave 1'}).waitFor();
  assert.equal(await page.getByText('Aether after wave',{exact:false}).count(),0,'no reading before wave 1');

  step('tap a category, then an offer; the picker moves to the next row');
  await offer(1).click();
  await page.getByRole('button',{name:/^Masses/}).click();
  await page.getByRole('button',{name:/^The Puffing Masses/}).click();
  assert.equal(await offer(1).inputValue(),'The Puffing Masses');
  // Phones show the picker as a dialog; wider screens show it inline under the row.
  const picker=page.getByRole(viewport.width<700?'dialog':'group',{name:'Offer 2 of 3'});
  await picker.waitFor();
  await noSeriousViolations(page,'Live Run with the picker open');
  await noZoomingFields(page,'Live Run with the picker open');
  await page.keyboard.press('Escape');
  await picker.waitFor({state:'detached'});

  step('unknown text can be recorded as unlisted');
  await offer(3).fill('zzz');
  await offer(3).press('Escape');
  await page.getByRole('button',{name:'record “zzz” as unlisted'}).waitFor();
  await page.getByRole('button',{name:'Clear offer 3'}).click();

  step('search offers by name and mechanic; partial text never reaches the recommender');
  await offer(1).fill('puff');
  await page.waitForTimeout(400);
  assert.equal(await estimates().count(),0);
  await offer(1).press('Enter');
  assert.equal(await offer(1).inputValue(),'The Puffing Masses');
  await pick(2,'massing','The Massing Masses');
  await pick(3,'chaos','The Chaotic Offering');
  await estimates().first().waitFor({timeout:25000});
  const recommendation=page.getByRole('region',{name:'Recommendation'});
  assert.match(await page.getByLabel('Estimate for The Puffing Masses').innerText(),/[+−]\d+/,'modeled estimates shown');
  assert((await recommendation.innerText()).includes('Chaotic Offering'));
  assert.equal(await page.getByLabel('Robustness').count(),1,'robustness verdict shown');
  assert((await page.getByText(/(High|Some) danger/).count())>0,'dangerous banes are flagged');
  // The link sits in the collapsed estimate details.
  const report=new URL(await page.getByRole('link',{name:'Something wrong? Report it',exact:true,includeHidden:true}).first().getAttribute('href'));
  assert.equal(report.searchParams.get('template'),'wrong-game-info.yml','each estimate links to the wrong-info form');
  assert(report.searchParams.get('context').includes('Before wave 1 of'),'the report carries the run context');

  step('the best offer is pre-selected before any choice');
  const best=await recommendation.getByRole('heading',{level:2}).innerText();
  let bestRow=0;
  for(const n of [1,2,3])if(await offer(n).inputValue()===best)bestRow=n;
  assert(bestRow>0,'the best offer is one of the rows');
  assert.equal(await page.getByRole('button',{name:`Choose offer ${bestRow}: ${best}`}).getAttribute('aria-pressed'),'true');
  await noSeriousViolations(page,'Live Run with offers entered');

  step('choose with the keyboard and record');
  await decisionHeading().click();
  await page.keyboard.press('1');
  assert.equal(await page.getByRole('button',{name:/Choose offer 1/}).getAttribute('aria-pressed'),'true');
  // Frozen timers stand in for a busy main thread, which can delay a deferred focus past the player's next action.
  // The page's Date can trail the clock after an idle stretch, so pause a second past either reading.
  await page.clock.pauseAt(Math.max(await page.evaluate(()=>Date.now()),Date.now())+1000);
  await page.keyboard.press('Control+Enter');
  await page.getByRole('heading',{name:'Offers before wave 2'}).waitFor();
  assert.equal((await chosenEvents())[0].payload.choiceSource,'picked','a number key is a deliberate choice');
  assert(await offer(1).evaluate(el=>el===document.activeElement),'recording moves focus to the first row');

  step('wave 2: reading taken on the offer screen, Pact offer added and taken');
  const aetherField=page.getByLabel(/Aether after wave 1/);
  await aetherField.fill('85');
  await page.clock.runFor(100);
  assert(await aetherField.evaluate(el=>el===document.activeElement),'recording never pulls focus back once the player moves on');
  await page.clock.resume();
  const counts=page.getByText('Event counts for wave 1',{exact:true});
  await counts.click();
  await noZoomingFields(page,'Live Run with event counts open');
  await counts.click();
  await pick(1,'burst','The Bursting Masses');
  // The Pact row's picker opens at the last pick's category, Masses.
  await page.getByRole('button',{name:'Add the Black Pact offer'}).click();
  await page.getByRole('button',{name:/^The Anchored Masses/}).click();
  assert.equal(await offer(4).inputValue(),'The Anchored Masses');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Choose offer 4/}).click();
  await page.getByLabel('Black Pact advice').waitFor({timeout:25000});
  await page.getByRole('button',{name:/Take The Anchored Masses/}).click();
  await page.getByRole('heading',{name:'Offers before wave 3'}).waitFor();
  await page.getByText(/Black Pact (offer )?used before wave 2/).waitFor();
  let run=(await stored()).runs[0];
  const reading=run.events.find(e=>e.type==='aether_observed');
  assert.deepEqual(reading.payload,{afterWave:1,totalAether:85});

  step('undo from the toast brings the last wave back for editing');
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByRole('heading',{name:'Offers before wave 2'}).waitFor();
  assert.equal(await offer(4).inputValue(),'The Anchored Masses');
  assert.equal(await page.getByLabel(/Aether after wave 1/).inputValue(),'85');
  assert.equal(await page.getByRole('button',{name:/Choose offer 4/}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:/Choose offer 1/}).click();
  await page.getByRole('button',{name:/Take The Bursting Masses/}).click();
  await page.getByRole('heading',{name:'Offers before wave 3'}).waitFor();

  step('progress survives a reload');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Offers before wave 3'}).waitFor();
  const taken=await page.getByLabel('Offers taken').innerText();
  assert(taken.includes('The Puffing Masses')&&taken.includes('The Bursting Masses'));

  step('a second tab editing the profile does not erase recorded waves');
  await other.getByLabel('Build',{exact:true}).fill('Blessed Shield (tab 2)');
  await other.close();
  await page.waitForTimeout(200);
  const afterTabs=(await stored()).runs[0].events.filter(e=>e.type==='offer_chosen').length;
  assert.equal(afterTabs,3,'both tabs kept every recorded choice, including the undone one');
  assert.equal((await stored()).profiles[0].buildName,'Blessed Shield (tab 2)');

  step('wave 3 by taps only, taking the pre-selected best');
  await offer(1).click();
  for(const [family,name] of [['Spires','The Rising Spires'],['Spires','The Draining Spires'],['Hellfire','The Burning Rain']]){
   await page.getByRole('button',{name:new RegExp('^'+family)}).click();
   await page.getByRole('button',{name:new RegExp('^'+name)}).click();
  }
  assert.equal(await offer(3).inputValue(),'The Burning Rain');
  await page.getByRole('button',{name:/^Take The /}).click();
  await page.getByRole('heading',{name:'Offers before wave 4'}).waitFor();
  const third=(await chosenEvents()).at(-1).payload;
  assert.equal(third.choiceSource,'default','taking the pre-selected offer is recorded as the default');
  assert.equal(third.chosen,third.recommendedOffer);

  step('end the run early; shortcuts cannot record the hidden decision');
  await pick(1,'rising','The Rising Spires');
  await pick(2,'draining','The Draining Spires');
  // Number keys are suspended while a picker is open, even with focus on a tile.
  const unselected=await page.getByRole('button',{name:/^Choose offer 2/}).getAttribute('aria-pressed')==='true'?1:2;
  await offer(3).click();
  await page.getByRole('button',{name:/^Masses/}).focus();
  await page.keyboard.press(String(unselected));
  assert.equal(await page.getByRole('button',{name:new RegExp(`^Choose offer ${unselected}`)}).getAttribute('aria-pressed'),'false');
  await page.keyboard.press('Escape');
  await pick(3,'hunting','The Summoned Hellborne (hunting you)');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'a long offer name never scrolls the page sideways');
  await decisionHeading().click();
  await page.keyboard.press('1');
  await page.getByRole('button',{name:'End run early'}).click();
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'End this run now?');
  const before=(await stored()).runs[0].events.length;
  await page.keyboard.press('Control+Enter');
  assert.equal((await stored()).runs[0].events.length,before);
  await page.getByLabel(/Final Aether/).fill('190');
  await noZoomingFields(page,'the end-run panel');
  await page.getByRole('button',{name:'End run',exact:true}).click();
  await page.getByRole('heading',{name:'Run ended'}).waitFor();
  run=(await stored()).runs[0];
  assert.equal(run.status,'abandoned');

  step('Insights lists the run and exports the full journal');
  await navTo(page,/^Insights/);
  await page.getByRole('heading',{name:'Insights'}).waitFor();
  await page.getByText(/3\s*recorded choices/i).first().waitFor();
  await noSeriousViolations(page,'Insights');
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:/Export (data|all runs)/}).click()]);
  const exported=JSON.parse(await readFile(await download.path(),'utf8'));
  // The export is the raw append-only journal: the undone offer set stays, suppressed by a correction.
  const events=exported.state.runs[0].events;
  assert.equal(events.filter(e=>e.type==='offers_presented').length,4);
  assert.equal(events.filter(e=>e.type==='correction').length,1);

  assert.deepEqual(errors,[],'Browser emitted errors');
 }catch(error){
  // Diagnostics for intermittent failures: what the page showed and logged.
  console.error('Browser errors:',errors);
  console.error('Recommendation panel:',await page.getByRole('region',{name:'Recommendation'}).innerText({timeout:1000}).catch(()=>'(none)'));
  console.error('Learned War Plan upgrades:',await page.getByRole('button',{pressed:true}).allInnerTexts().catch(()=>'(none)'));
  throw error;
 }finally{await context.close()}
}

try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  console.log(`${viewport.width}×${viewport.height}`);
  await journey(viewport);
 }
 console.log('v2 browser smoke passed');
}finally{await browser.close()}
