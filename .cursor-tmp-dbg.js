const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/raisin.html');
  console.log(await page.evaluate(() => { let el = document.querySelector('[data-vs-viewport]'); const out = []; while (el && out.length < 8) { const cs = getComputedStyle(el); out.push([el.className.slice(0,50), el.getBoundingClientRect().width, cs.display, cs.width, cs.gridTemplateColumns, cs.position].join(' | ')); el = el.parentElement; } return out.join('\n'); }));
  await b.close();
})();
