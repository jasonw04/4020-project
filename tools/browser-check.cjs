// Optional browser smoke check. Set PLAYWRIGHT_MODULE to your Playwright installation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3107'},stdio:['ignore','pipe','inherit'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3107');
  await page.getByRole('heading',{name:/Your next chapter/}).waitFor();
  await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'+ Add to plan'}).first().click();
  await page.locator('nav').getByText('Semester planner').click();
  await page.getByRole('button',{name:'Save plan'}).click();
  await page.getByRole('button',{name:'Enrol',exact:true}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.getByText('Action recorded',{exact:true}).waitFor();
  await page.reload();await page.getByText('Action recorded',{exact:true}).waitFor();
  await page.locator('nav').getByText('Planning assistant').click();
  await page.getByRole('button',{name:'Find my starting point'}).click();
  await page.getByRole('button',{name:'Use this plan'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.getByRole('heading',{name:'Make your next move.'}).waitFor();
  await page.locator('nav').getByText('Course explorer').click();
  await page.getByRole('searchbox').fill('zzzz');
  await page.getByRole('heading',{name:'No matching courses'}).waitFor();
  await page.getByRole('button',{name:'Clear filters'}).click();
  await page.setViewportSize({width:390,height:844});
  for(const route of ['overview','requirements','courses','planner','assistant']){
   await page.goto('http://127.0.0.1:3107/#'+route);
   await page.locator('h1').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' mobile overflow');
  }
  await page.goto('http://127.0.0.1:3107/#overview');
  await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: planning, confirmation, persistence, recommendations, search, and all five mobile layouts.');
 } finally {await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
