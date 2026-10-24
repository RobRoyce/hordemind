import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

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
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hordemind-v2-local-v1')));
 const offer=n=>page.getByRole('combobox',{name:`Offer ${n}`});
 const estimates=()=>page.getByLabel(/^Estimate for /);
 const decisionHeading=()=>page.getByRole('heading',{name:/Offers before wave/});
 async function pick(n,query,label){
  await offer(n).fill(query);
  await page.getByRole('option',{name:new RegExp(label)}).first().waitFor();
  await offer(n).press('Enter');
  assert.equal(await offer(n).inputValue(),label);
 }

 try{
  await page.goto(base+'#strategy',{waitUntil:'domcontentloaded'});

  step('create a Paladin and configure it without any save button');
  await page.getByLabel('Character name').fill('CI Paladin');
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

  step('a malformed build link is rejected inline and never blocks saving');
  await page.getByLabel('Build planner link').fill('not a link');
  await page.getByText('does not look like a web address').waitFor();
  await page.getByLabel('Build planner link').fill('maxroll.gg/d4/planner/ci');
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

  step('an empty picker lists the whole catalog, not a first page');
  await offer(1).click();
  assert((await page.getByRole('option').count())>40,'all offers are browsable before wave 1');
  await offer(1).press('Escape');

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

  step('choose with the keyboard and record');
  await decisionHeading().click();
  await page.keyboard.press('1');
  assert.equal(await page.getByRole('button',{name:/Choose offer 1/}).getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Control+Enter');
  await page.getByRole('heading',{name:'Offers before wave 2'}).waitFor();

  step('wave 2: reading taken on the offer screen, Pact offer marked and taken');
  await page.getByLabel(/Aether after wave 1/).fill('85');
  await pick(1,'burst','The Bursting Masses');
  await pick(2,'anch','The Anchored Masses');
  await page.getByRole('button',{name:'Mark offer 2 as the Black Pact offer'}).click();
  await page.getByRole('button',{name:/Choose offer 2/}).click();
  await page.getByLabel('Black Pact advice').waitFor({timeout:25000});
  await page.getByRole('button',{name:/Take The Anchored Masses/}).click();
  await page.getByRole('heading',{name:'Offers before wave 3'}).waitFor();
  await page.getByText(/Black Pact (offer )?used before wave 2/).waitFor();
  let run=(await stored()).runs[0];
  const reading=run.events.find(e=>e.type==='aether_observed');
  assert.deepEqual(reading.payload,{afterWave:1,totalAether:85});

  step('undo brings the last wave back for editing');
  await page.getByRole('button',{name:'Undo last decision'}).click();
  await page.getByRole('heading',{name:'Offers before wave 2'}).waitFor();
  assert.equal(await offer(2).inputValue(),'The Anchored Masses');
  assert.equal(await page.getByLabel(/Aether after wave 1/).inputValue(),'85');
  assert.equal(await page.getByRole('button',{name:/Choose offer 2/}).getAttribute('aria-pressed'),'true');
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

  step('end the run early; shortcuts cannot record the hidden decision');
  await pick(1,'rising','The Rising Spires');
  await pick(2,'draining','The Draining Spires');
  await decisionHeading().click();
  await page.keyboard.press('1');
  await page.getByRole('button',{name:'End run early'}).click();
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'End this run now?');
  const before=(await stored()).runs[0].events.length;
  await page.keyboard.press('Control+Enter');
  assert.equal((await stored()).runs[0].events.length,before);
  await page.getByLabel(/Final Aether/).fill('190');
  await page.getByRole('button',{name:'End run',exact:true}).click();
  await page.getByRole('heading',{name:'Run ended'}).waitFor();
  run=(await stored()).runs[0];
  assert.equal(run.status,'abandoned');

  step('Insights lists the run and exports the full journal');
  await navTo(page,/^Insights/);
  await page.getByRole('heading',{name:'Insights'}).waitFor();
  await page.getByText(/2\s*recorded choices/i).first().waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:/Export (data|all runs)/}).click()]);
  const exported=JSON.parse(await readFile(await download.path(),'utf8'));
  // The export is the raw append-only journal: the undone offer set stays, suppressed by a correction.
  const events=exported.state.runs[0].events;
  assert.equal(events.filter(e=>e.type==='offers_presented').length,3);
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
