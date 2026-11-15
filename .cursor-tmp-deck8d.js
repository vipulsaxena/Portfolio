const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem('vipulPresent', '1'));
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await p.goto('http://localhost:8765/raisin-presentation.html#8', { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  const S = '.present-slide.is-active ';
  const st = () => p.evaluate(() => {
    const s = document.querySelector('.present-slide.is-active');
    const sw = s.querySelector('.validation-stage__switch');
    return {
      slide: s.dataset.slideId,
      counter: document.querySelector('.deck-count, [class*=counter]')?.textContent.trim() ,
      footer: [...document.querySelectorAll('*')].filter(e=>!e.children.length && /^\d+ ?\/ ?\d+$|^\d+\.\d$/.test(e.textContent.trim())).map(e=>e.textContent.trim()).join('|'),
      active: s.querySelector('.validation-card.is-active')?.textContent.replace(/\s+/g,' ').trim().slice(0,40),
      canvas: s.querySelector('[data-vs-canvas]')?.style.transform,
      mode: s.querySelector('[data-validation-stage]')?.dataset.mode,
      sw: sw?.getAttribute('aria-checked') ?? sw?.getAttribute('aria-pressed'),
    };
  });
  console.log('initial', JSON.stringify(await st()));
  await p.locator(S+'.validation-card').nth(1).click(); await p.waitForTimeout(900);
  console.log('card1', JSON.stringify(await st()));
  await p.locator(S+'.validation-card').nth(2).click(); await p.waitForTimeout(900);
  console.log('card2', JSON.stringify(await st()));
  await p.locator(S+'.validation-stage__ctrl').nth(0).click(); await p.waitForTimeout(500);
  console.log('zoom+', JSON.stringify(await st()));
  await p.locator(S+'.validation-stage__ctrl').nth(1).click(); await p.waitForTimeout(500);
  console.log('zoom-', JSON.stringify(await st()));
  await p.locator(S+'.validation-stage__ctrl').nth(2).click(); await p.waitForTimeout(500);
  console.log('fit', JSON.stringify(await st()));
  // drag pan
  const vp = await p.locator(S+'[data-vs-viewport]').boundingBox();
  await p.mouse.move(vp.x+200, vp.y+150); await p.mouse.down(); await p.mouse.move(vp.x+120, vp.y+100, {steps:8}); await p.mouse.up();
  console.log('drag', JSON.stringify(await st()));
  await p.locator(S+'.validation-stage__switch').click(); await p.waitForTimeout(700);
  console.log('toggle', JSON.stringify(await st()));
  await p.screenshot({ path: '/tmp/shots/s8-toggle.png' });
  await p.locator(S+'.validation-stage__switch').click(); await p.waitForTimeout(700);
  console.log('toggle back', JSON.stringify(await st()));
  // keyboard substeps
  await p.locator(S+'.validation-card').nth(0).click(); await p.waitForTimeout(600);
  await p.mouse.click(5,5);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
  console.log('key→', JSON.stringify(await st()));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
  console.log('key→', JSON.stringify(await st()));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
  console.log('key→', JSON.stringify(await st()));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500);
  console.log('key→ (expect slide 9)', JSON.stringify(await st()));
  await p.screenshot({ path: '/tmp/shots/s9.png' });
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1500);
  console.log('key← (back to 8 last step)', JSON.stringify(await st()));
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(800);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(800);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(800);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1500);
  console.log('to 7', await p.evaluate(()=>document.querySelector('.present-slide.is-active').dataset.slideId));
  console.log(logs.join('\n') || 'no console errors');
  await b.close();
})();
