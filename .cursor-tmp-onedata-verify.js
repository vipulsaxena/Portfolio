const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  for (const [w, h, name] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.goto('http://localhost:8765/raisin.html?cb=' + Date.now(), { waitUntil: 'load' });
    await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
    const el = page.locator('.ai-journey__one-data');
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(5000);
    const info = await page.evaluate(() => {
      const root = document.querySelector('.ai-journey__one-data');
      const vp = root.querySelector('[data-prototype-viewport]');
      const fr = root.querySelector('iframe');
      const r = vp.getBoundingClientRect();
      const row = root.querySelector('.ai-journey__row--one-data');
      return {
        tabRows: root.querySelectorAll('.prototype-embed-controls,[data-prototype-variants],[data-prototype-personas]').length,
        vp: [Math.round(r.width), Math.round(r.height)],
        ratio: +(r.width / r.height).toFixed(3),
        scale: vp.style.getPropertyValue('--proto-scale'),
        iframeSrc: fr.src, iframeLoadingAttr: fr.getAttribute('loading'),
        rowCols: getComputedStyle(row).gridTemplateColumns,
        docOverflowX: document.documentElement.scrollWidth > innerWidth,
        copyTop: Math.round(root.querySelector('.device-story__copy').getBoundingClientRect().top - r.bottom),
      };
    });
    const frame = page.frames().find(f => f.url().includes('web-parity-dashboard'));
    info.innerLoaded = frame ? await frame.evaluate(() => document.body.innerText.slice(0, 80).replace(/\s+/g, ' ')) : null;
    await el.screenshot({ path: `/tmp/onedata-${name}.png` });
    if (name === 'desktop') {
      await page.locator('[data-proto-wide-toggle]').click();
      await page.waitForTimeout(800);
      info.narrowCols = await page.evaluate(() => getComputedStyle(document.querySelector('.ai-journey__row--one-data')).gridTemplateColumns);
      await el.screenshot({ path: `/tmp/onedata-desktop-narrow.png` });
    }
    console.log(name, JSON.stringify(info, null, 1), 'errors:', errs);
    await ctx.close();
  }
  await browser.close();
})();
