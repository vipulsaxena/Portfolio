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
  const info = await p.evaluate(() => {
    const s = document.querySelector('.present-slide.is-active');
    const q = sel => [...s.querySelectorAll(sel)].map(e => ({ tag: e.tagName, cls: e.className.toString().slice(0,80), txt: (e.textContent||'').trim().slice(0,30), r: (()=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})() }));
    return {
      buttons: q('button, [role=tab], [role=switch], input, a[href]'),
      roots: q('[data-validation-conflicts], [data-validation-board], [data-trade-off-switcher], [data-phase-wizard]'),
      counter: document.querySelector('.deck-counter, [data-counter]')?.textContent
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log(logs.join('\n'));
  await b.close();
})();
