const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
  const p = await ctx.newPage(); const logs=[];
  p.on('pageerror', e => logs.push(e.message));
  await p.goto('http://localhost:8765/raisin-presentation.html#9'); await p.waitForTimeout(1800);
  for (let k=0;k<2;k++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900); }
  console.log(await p.evaluate(() => { const v=document.querySelector('.present-slide.is-active [data-wizard-scroll-viewport]'); const r=v.getBoundingClientRect(); return {cnt: document.querySelector('.present-slide.is-active').dataset.slideId, init: v.dataset.presentWizardScrollInit, w:r.width, h:r.height, fm: v.getAttribute('data-fm-widget')}; }));
  const box = await p.locator('.present-slide.is-active [data-wizard-scroll-viewport]').first().boundingBox();
  if (box) { const sel='.present-slide.is-active [data-wizard-scroll-canvas]'; const t0=await p.locator(sel).evaluate(e=>e.style.transform); await p.mouse.move(box.x+box.width/2, box.y+box.height/2); await p.mouse.wheel(0,-400); await p.waitForTimeout(500); console.log(t0,'->',await p.locator(sel).evaluate(e=>e.style.transform)); }
  console.log('errors', logs.join('|')||'none');
  await b.close();
})();
