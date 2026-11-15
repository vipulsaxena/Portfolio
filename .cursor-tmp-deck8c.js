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
  const state = () => p.evaluate(() => {
    const s = document.querySelector('.present-slide.is-active');
    const v = s.querySelector('.validation-stage');
    return {
      counter: document.querySelector('.deck-count, .counter, [data-cur], #cur')?.textContent,
      cur: [...document.querySelectorAll('*')].find(e=>e.children.length===0 && /^\d+(\.\d+)?$/.test(e.textContent.trim()) && e.closest('.deck-chrome, .present-footer, footer, [class*=chrome]'))?.textContent,
      active: s.querySelector('.validation-card.is-active')?.textContent.replace(/\s+/g,' ').trim().slice(0,60),
      stageCls: v?.className, transform: s.querySelector('[class*=validation-stage__canvas],[class*=validation-stage__pan],[class*=board]')?.style.cssText,
      switchPressed: s.querySelector('.validation-stage__switch')?.getAttribute('aria-checked') || s.querySelector('.validation-stage__switch')?.getAttribute('aria-pressed'),
      stageHtmlHead: v ? v.outerHTML.slice(0,300) : null
    };
  });
  const hit = async (sel, idx=0) => p.evaluate(({sel,idx}) => {
    const s = document.querySelector('.present-slide.is-active');
    const el = s.querySelectorAll(sel)[idx];
    const r = el.getBoundingClientRect();
    const cx = r.x+r.width/2, cy = r.y+r.height/2;
    const stack = document.elementsFromPoint(cx, cy).slice(0,4).map(e => e.tagName+'.'+e.className.toString().slice(0,50));
    return { inView: cx<innerWidth && cy<innerHeight, cx: Math.round(cx), cy: Math.round(cy), top: stack, targetIsTop: el.contains(document.elementFromPoint(cx,cy)) };
  }, {sel,idx});
  console.log('initial', JSON.stringify(await state()));
  for (const [sel, idx] of [['.validation-stage__ctrl',0],['.validation-stage__ctrl',1],['.validation-stage__ctrl',2],['.validation-stage__switch',0],['.workflow-strip__step',0],['.workflow-strip__step',4],['.validation-card',1],['.validation-card',2]]) {
    const h = await hit(sel, idx);
    console.log(sel, idx, JSON.stringify(h));
  }
  // click tests
  await p.locator('.present-slide.is-active .validation-card').nth(1).click({ timeout: 3000 }).catch(e=>console.log('card1 click fail', e.message.split('\n')[0]));
  await p.waitForTimeout(500);
  console.log('after card1', JSON.stringify(await state()));
  await p.locator('.present-slide.is-active .validation-stage__switch').click({ timeout: 3000 }).catch(e=>console.log('switch fail', e.message.split('\n')[0]));
  await p.waitForTimeout(500);
  console.log('after switch', JSON.stringify(await state()));
  await p.locator('.present-slide.is-active .validation-stage__ctrl').nth(0).click({ timeout: 3000 }).catch(e=>console.log('zoom+ fail', e.message.split('\n')[0]));
  await p.screenshot({ path: '/tmp/shots/s8-after.png' });
  console.log(logs.join('\n'));
  await b.close();
})();
