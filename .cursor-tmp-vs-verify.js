const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const [name, vw, vh] of [['d', 1440, 900], ['m', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
    await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
    await page.goto('http://localhost:8765/raisin.html', { waitUntil: 'load' });
    await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
    const beat = page.locator('[data-validation-stage]').first();
    await beat.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const tf = () => page.evaluate(() => {
      const c = document.querySelector('[data-vs-canvas]');
      const v = document.querySelector('[data-vs-viewport]');
      return { t: c.style.transform, chip: document.querySelector('[data-validation-chip]').textContent, free: document.querySelector('[data-validation-chip]').className, vw: v.clientWidth, vh: v.clientHeight };
    });
    console.log(name, 'initial', JSON.stringify(await tf()));
    const cards = page.locator('[data-conflict-tab]');
    const n = await cards.count();
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      await cards.nth(i).scrollIntoViewIfNeeded();
      await cards.nth(i).click();
      await page.waitForTimeout(1000);
      const s = await tf();
      seen.add(s.t);
      console.log(name, i, JSON.stringify(s));
      if (i === 0 || i === 2) {
        await page.locator('.wealth-hub-beat:has([data-validation-stage])').first().screenshot({ path: `/tmp/vs-${name}-${i}.png` });
        await page.locator('[data-vs-viewport]').screenshot({ path: `/tmp/vs-${name}-${i}-stage.png` });
      }
    }
    console.log(name, 'distinct transforms', seen.size, 'of', n);
    // mode toggle
    const tog = page.locator('[data-vs-mode-toggle]');
    await tog.click(); await page.waitForTimeout(500);
    console.log(name, 'video mode', await page.evaluate(() => ({ mode: document.querySelector('[data-validation-stage]').dataset.mode, vidHidden: document.querySelector('[data-vs-video]').hidden, canvasVis: getComputedStyle(document.querySelector('[data-vs-canvas]')).visibility })));
    await page.locator('[data-vs-viewport]').screenshot({ path: `/tmp/vs-${name}-video.png` });
    await tog.click(); await page.waitForTimeout(500);
    console.log(name, 'board mode', await page.evaluate(() => ({ mode: document.querySelector('[data-validation-stage]').dataset.mode, vidHidden: document.querySelector('[data-vs-video]').hidden, canvasVis: getComputedStyle(document.querySelector('[data-vs-canvas]')).visibility })));
    // card click while in video -> board
    await cards.nth(1).evaluate((el) => el.scrollIntoView({ block: "nearest", inline: "center" })); await cards.nth(1).click(); await page.waitForTimeout(800);
    // keyboard nav
    await cards.nth(1).focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800);
    console.log(name, 'kbd active', await page.evaluate(() => document.querySelector('[data-conflict-tab].is-active').dataset.conflictTab), JSON.stringify(await tf()));
    // zoom controls & drag
    await page.locator('[data-vs-zoom="out"]').click(); await page.waitForTimeout(800);
    console.log(name, 'zoom out', JSON.stringify(await tf()));
    const box = await page.locator('[data-vs-viewport]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 5 }); await page.mouse.up();
    console.log(name, 'after drag', JSON.stringify(await tf()));
    console.log(name, 'errors', JSON.stringify(errs));
    await ctx.close();
  }
  await browser.close();
})();
