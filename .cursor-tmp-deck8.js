const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n')));
  await p.goto('http://localhost:8765/raisin-presentation.html#8', { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  console.log(await p.evaluate(() => ({
    id: document.querySelector('.present-slide.is-active')?.dataset.slideId,
    counter: document.querySelector('[data-current], .ct-num, #presentCur')?.textContent,
    hash: location.hash,
    html: document.body.className
  })));
  await p.screenshot({ path: '/tmp/shots/s8.png' });
  console.log(logs.join('\n'));
  await b.close();
})();
