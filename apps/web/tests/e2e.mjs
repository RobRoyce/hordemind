import {chromium} from 'playwright';
import assert from 'node:assert/strict';

// GitHub Ubuntu runners ship Chrome; avoid downloading browser binaries on every PR.
const browser=await chromium.launch({
 headless:true,
 ...(process.env.E2E_CHROMIUM_EXECUTABLE
   ? {executablePath:process.env.E2E_CHROMIUM_EXECUTABLE}
   : process.env.E2E_BUNDLED_CHROMIUM==='1' ? {} : {channel:'chrome'})
});
const page=await browser.newPage({viewport:{width:1200,height:850}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(process.env.E2E_BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Strategy Lab'}).waitFor({timeout:15000}).catch(async()=>{
  await page.getByRole('button',{name:/Strategy Lab/}).click();
  await page.getByRole('heading',{name:'Strategy Lab'}).waitFor();
 });
 await page.getByLabel('Character name').fill('CI Paladin');
 await page.getByLabel('Difficulty',{exact:true}).selectOption('Torment XII');
 await page.getByLabel('Realm / game mode',{exact:true}).selectOption('Eternal');
 await page.getByLabel('Elite / Lord clear speed',{exact:true}).selectOption('fast');
 await page.getByLabel('Mobility',{exact:true}).selectOption('low');
 await page.getByRole('checkbox',{name:/The Black Pact/}).check();
 await page.getByRole('button',{name:'Save character'}).click();
 await page.getByRole('button',{name:/Live Run/}).click();
 await page.getByText('Ready with').waitFor();
 assert((await page.locator('.setup-overview').innerText()).includes('The Black Pact'));
 assert((await page.locator('.setup-overview').innerText()).includes('Mobility: low'));
 await page.getByRole('button',{name:/Strategy Lab/}).click();
 await page.getByLabel('Difficulty',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Difficulty',{exact:true}).inputValue(),'Torment XII');
 assert.equal(await page.getByLabel('Realm / game mode',{exact:true}).inputValue(),'Eternal');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByLabel('Difficulty',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Difficulty',{exact:true}).inputValue(),'Torment XII');
 await page.getByRole('button',{name:/Start live run/}).click();
 await page.getByText('What appeared on your screen?').waitFor();
 await page.getByLabel('Offer 1').fill('The Puffing Masses');
 await page.getByLabel('Offer 2').fill('The Massing Masses');
 await page.getByRole('heading',{name:'Which offering should I take?'}).waitFor();
 await page.locator('.recommend-card').first().waitFor({timeout:25000});
 assert((await page.locator('.recommendations').innerText()).includes('Modeled marginal gain'));
 assert(!(await page.locator('.recommendations').innerText()).includes('model migration pending'));

 await page.locator('.offer-entry').first().getByRole('button',{name:'Select'}).click();
 await page.getByRole('button',{name:/Record chosen offer/}).click();
 await page.getByRole('heading',{name:'Record outcome'}).waitFor();
 await page.getByRole('button',{name:'Skip observation'}).click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByText('Selected so far').waitFor();
 assert((await page.locator('.stack').innerText()).includes('The Puffing Masses'));
 await page.getByRole('button',{name:/Insights/}).click();
 await page.getByRole('heading',{name:'Insights'}).waitFor();
 assert((await page.locator('.stat').nth(1).innerText()).includes('1'));
 assert.deepEqual(errors,[],'Browser emitted JavaScript errors');
 console.log('v2 browser smoke passed');
}finally{await browser.close()}
