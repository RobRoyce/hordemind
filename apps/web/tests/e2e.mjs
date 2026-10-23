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
const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
const step=name=>console.log('  ·',name);
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hordemind-v2-local-v1')));
const offer=n=>page.getByRole('combobox',{name:`Offer ${n}`});
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
 await page.getByLabel('Difficulty',{exact:true}).selectOption('Torment XII');
 await page.getByLabel('Realm',{exact:true}).selectOption('Eternal');
 await page.getByLabel('Build',{exact:true}).fill('Blessed Shield');
 await page.getByLabel('Elite / Lord clear speed',{exact:true}).selectOption('fast');
 await page.getByLabel('Mobility',{exact:true}).selectOption('low');
 await page.getByRole('checkbox',{name:/The Black Pact/}).check();

 step('a malformed build link is rejected inline and never blocks saving');
 await page.getByLabel('Build planner link').fill('not a link');
 await page.getByText('does not look like a web address').waitFor();
 await page.getByLabel('Build planner link').fill('maxroll.gg/d4/planner/ci');
 const profile=(await stored()).profiles[0];
 assert.equal(profile.buildUrl,'https://maxroll.gg/d4/planner/ci');
 assert.equal(profile.mobility,'low');
 assert.equal(profile.specialOfferingAvailable,true,'The Black Pact enables the special offer');

 step('configuration survives navigation and reload');
 await page.getByRole('button',{name:/Live Run/}).click();
 await page.getByRole('button',{name:'Start run'}).waitFor();
 assert((await page.locator('.character-summary').innerText()).includes('The Black Pact'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Strategy Lab/}).click();
 assert.equal(await page.getByLabel('Difficulty',{exact:true}).inputValue(),'Torment XII');
 assert.equal(await page.getByLabel('Mobility',{exact:true}).inputValue(),'low');
 assert.equal(await page.getByLabel('Realm',{exact:true}).inputValue(),'Eternal');

 step('start a run: the first offer comes before wave 1');
 await page.getByRole('button',{name:'Start live run'}).click();
 await page.getByRole('heading',{name:'Offers before wave 1'}).waitFor();
 assert.equal(await page.getByText('Aether after wave',{exact:false}).count(),0,'no reading before wave 1');

 step('search offers by name and mechanic; partial text never reaches the recommender');
 await offer(1).fill('puff');
 await page.waitForTimeout(400);
 assert.equal(await page.locator('.recommend-card').count(),0);
 await offer(1).press('Enter');
 assert.equal(await offer(1).inputValue(),'The Puffing Masses');
 await pick(2,'massing','The Massing Masses');
 await pick(3,'chaos','Chaotic Offering');
 await page.locator('.recommend-card').first().waitFor({timeout:25000});
 const recText=await page.locator('.recommendations').innerText();
 assert(recText.includes('Aether, modeled'),'modeled estimates shown');
 assert(recText.includes('Chaotic Offering'));

 step('choose with the keyboard and record');
 await page.locator('#decision-title').click();
 await page.keyboard.press('1');
 assert.equal(await page.getByRole('button',{name:/Choose offer 1/}).getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Control+Enter');
 await page.getByRole('heading',{name:'Offers before wave 2'}).waitFor();

 step('wave 2: reading taken on the offer screen, Pact offer marked and taken');
 await page.getByLabel(/Aether after wave 1/).fill('85');
 await pick(1,'burst','The Bursting Masses');
 await pick(2,'anch','The Anchored Masses');
 await page.locator('.offer-row').nth(1).getByRole('button',{name:'Pact'}).click();
 await page.getByRole('button',{name:/Choose offer 2/}).click();
 await page.getByRole('button',{name:/Take The Anchored Masses/}).click();
 await page.getByRole('heading',{name:'Offers before wave 3'}).waitFor();
 assert((await page.locator('.special-status').innerText()).includes('used before wave 2'));
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
 const stack=await page.locator('.stack').innerText();
 assert(stack.includes('The Puffing Masses')&&stack.includes('The Bursting Masses'));

 step('end the run early');
 await page.getByRole('button',{name:'End run early'}).click();
 await page.getByLabel(/Final Aether/).fill('190');
 await page.getByRole('button',{name:'End run',exact:true}).click();
 await page.getByRole('heading',{name:'Run ended'}).waitFor();
 run=(await stored()).runs[0];
 assert.equal(run.status,'abandoned');

 step('Insights lists the run and exports the full journal');
 await page.getByRole('button',{name:/Insights/}).click();
 await page.getByRole('heading',{name:'Insights'}).waitFor();
 assert((await page.locator('.stat').nth(1).innerText()).includes('2'));
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:/Export data/}).click()]);
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));
 // The export is the raw append-only journal: the undone offer set stays, suppressed by a correction.
 const events=exported.state.runs[0].events;
 assert.equal(events.filter(e=>e.type==='offers_presented').length,3);
 assert.equal(events.filter(e=>e.type==='correction').length,1);

 assert.deepEqual(errors,[],'Browser emitted errors');
 console.log('v2 browser smoke passed');
}finally{await browser.close()}
