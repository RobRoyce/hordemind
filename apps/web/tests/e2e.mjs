import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1200,height:850}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Strategy Lab'}).waitFor({timeout:15000}).catch(async()=>{
  await page.getByRole('button',{name:/Strategy Lab/}).click();
  await page.getByRole('heading',{name:'Strategy Lab'}).waitFor();
 });
 await page.getByLabel('Character name').fill('CI Paladin');
 await page.getByRole('button',{name:/Start live run/}).click();
 await page.getByText('What appeared on your screen?').waitFor();
 await page.getByLabel('Offer 1').fill('The Puffing Masses');
 await page.getByLabel('Offer 2').fill('The Massing Masses');
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
