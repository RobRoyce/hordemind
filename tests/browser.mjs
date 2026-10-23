import {chromium} from "playwright";
import {strict as assert} from "node:assert";
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 await page.goto("http://127.0.0.1:8765/",{waitUntil:"networkidle",timeout:30000});
 await page.locator("h1").waitFor({timeout:15000});
 assert((await page.locator("h1").innerText()).includes("Horde"));
 const picker=page.getByPlaceholder("Type to filter offers…");
 await picker.nth(0).fill("Puffing");
 await page.getByRole("button",{name:/The Puffing Masses/}).first().click();
 await picker.nth(1).fill("Bursting");
 await page.getByRole("button",{name:/The Bursting Masses/}).first().click();
 await page.getByRole("button",{name:/Compare expected Aether/}).click();
 await page.locator(".result").first().waitFor({timeout:40000});
 await page.getByRole("button",{name:"Share run"}).click();
 await page.locator("textarea.share").waitFor();
 assert((await page.locator("textarea.share").inputValue()).includes("#run="));
 assert.deepEqual(errors,[],"Browser emitted JS errors");
 console.log("Browser smoke test passed");
}finally{await browser.close()}
