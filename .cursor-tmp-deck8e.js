const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', m => { if (['error'].includes(m.type())) logs.push(m.text()); });
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  for (const n of [7, 9]) {
    await p.goto('about:blank'); await p.goto('http://localhost:8765/raisin-presentation.html#' + n, { waitUntil: 'load' });
    await p.waitForTimeout(1800);
    const S = '.present-slide.is-active ';
    const r = await p.evaluate(() => {
      const s = document.querySelector('.present-slide.is-active');
      return { id: s.dataset.slideId, tabs: s.querySelectorAll('[role=tab],.wizard-step,[data-phase-step]').length, scrollVp: s.querySelectorAll('[data-wizard-scroll-viewport]').length, ctrls: s.querySelectorAll('button').length };
    });
    console.log(n, JSON.stringify(r));
    const vp = p.locator(S+'[data-wizard-scroll-viewport]');
    if (await vp.count()) {
      const t0 = await p.locator(S+'[data-wizard-scroll-canvas]').evaluate(e => e.style.transform);
      const box = await vp.first().boundingBox();
      await p.mouse.move(box.x+box.width/2, box.y+box.height/2); await p.mouse.wheel(0, -400); await p.waitForTimeout(500);
      const t1 = await p.locator(S+'[data-wizard-scroll-canvas]').evaluate(e => e.style.transform);
      console.log(' wizard-scroll zoom', t0, '->', t1);
    }
    await p.screenshot({ path: `/tmp/shots/slide${n}.png` });
  }
  // case study page
  const q = await ctx.newPage(); const l2 = [];
  q.on('pageerror', e => l2.push(e.message)); q.on('console', m => m.type()==='error' && l2.push(m.text()));
  await q.goto('http://localhost:8765/raisin.html', { waitUntil: 'load' }); await q.waitForTimeout(2000);
  const c = q.locator('[data-validation-conflicts] .validation-card').nth(1);
  await c.scrollIntoViewIfNeeded(); await c.click(); await q.waitForTimeout(800);
  console.log('raisin.html active card:', await q.locator('[data-validation-conflicts] .validation-card.is-active').first().textContent().then(t=>t.replace(/\s+/g,' ').trim().slice(0,40)));
  console.log('raisin.html errors:', l2.join('|') || 'none');
  console.log('deck errors:', logs.join('|') || 'none');
  await b.close();
})();
