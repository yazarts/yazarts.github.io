// Local end-to-end check of the portfolio site (Playwright + system Chrome). Not deployed.
// 1) bash scripts/build_local.sh   2) serve /tmp/yaz-build/site on :8091 and /tmp/yaz-build/sub on :8092
// 3) node scripts/check.js [baseURL]   -> screenshots in ./screenshots (gitignored)
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:8091/';
const SUB = process.env.SUB || 'http://localhost:8092/yazarts/';
const OUT = path.join(__dirname, '..', 'screenshots'); fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n) });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function ctx(b, w, h, mob) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 3 : 1 });
  const hits = [];   // fake the free like/view counter so tests never touch the real counts
  await c.route('https://abacus.jasoncameron.dev/**', r => { hits.push(r.request().url()); r.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"value":7}' }); });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  p.on('requestfailed', r => { const t = r.failure()?.errorText || ''; if (/abacus|fonts\./.test(r.url()) || (/ERR_ABORTED/.test(t) && /\.(mp3|m4a|ogg|wav)$/.test(r.url()))) return; errs.push('request failed ' + r.url() + ' ' + t); });   // aborted audio = streaming stopped on purpose
  return { c, p, errs, hits };
}
const go = (p, sel) => p.evaluate(s => document.querySelector(s).scrollIntoView({ behavior: 'instant', block: 'start' }), sel);

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    const tag = mob ? 'mobile' : 'desktop', L = `[${w}] `;
    const { c, p, errs, hits } = await ctx(b, w, h, mob);
    await p.goto(BASE, { waitUntil: 'load' }); await p.mouse.move(2, 2); await p.waitForTimeout(2600);
    // hero: transparent image, no box
    const hero = await p.evaluate(() => {
      const i = document.querySelector('#heroImg'), f = i.closest('figure'), cs = getComputedStyle(i), fs = getComputedStyle(f);
      const r = i.getBoundingClientRect(), t = document.querySelector('.hero-text').getBoundingClientRect();
      return { loaded: i.complete && i.naturalWidth > 0, png: /\.png/.test(i.currentSrc), bg: cs.backgroundColor + '|' + fs.backgroundColor, border: cs.borderStyle + fs.borderStyle,
        shadow: cs.boxShadow + fs.boxShadow, filter: cs.filter, imgLeft: r.left, imgBottom: r.bottom, textLeft: t.left, textTop: t.top };
    });
    ok(hero.loaded && hero.png, L + 'hero cut-out PNG loaded');
    ok(hero.bg === 'rgba(0, 0, 0, 0)|rgba(0, 0, 0, 0)' && hero.shadow === 'nonenone' && !/solid/.test(hero.border), L + 'hero image has no box (bg/border/box-shadow none; filter: ' + hero.filter.slice(0, 40) + ')');
    ok(mob ? hero.imgBottom <= hero.textTop + 5 : hero.imgLeft < hero.textLeft, L + (mob ? 'hero image stacks above text' : 'hero image left of text'));
    await shot(p, mob ? 'mobile-hero.png' : 'hero-desktop.png');
    // visible text must not say gallery
    const txt = await p.evaluate(() => document.body.innerText + document.title + [...document.querySelectorAll('[aria-label],[alt],[title],meta[content]')].map(e => (e.getAttribute('aria-label') || '') + (e.getAttribute('alt') || '') + (e.getAttribute('title') || '') + (e.getAttribute('content') || '')).join(' '));
    ok(!/gallery/i.test(txt), L + 'no "gallery" in visible text, titles, labels or meta');
    // portfolio band
    await go(p, '#portfolio'); await p.waitForTimeout(1400);
    const pf = await p.evaluate(() => { const s = document.querySelector('#pfScroll'), bs = [...document.querySelectorAll('.brick')];
      const asp = bs.map(x => { const r = x.getBoundingClientRect(), i = x.querySelector('img'); return [+(r.width / r.height).toFixed(2), +(i.naturalWidth / i.naturalHeight).toFixed(2)]; });
      return { n: bs.length, sw: s.scrollWidth, cw: s.clientWidth, th: document.querySelector('#pfTrack').getBoundingClientRect().height, firstH: bs[0].getBoundingClientRect().height, asp,
        sized: bs.every(x => x.style.getPropertyValue('--w') || x.style.width), mask: getComputedStyle(s).maskImage || getComputedStyle(s).webkitMaskImage }; });
    ok(pf.n === 9, L + `portfolio shows all ${pf.n} artworks`);
    ok(pf.sw > pf.cw + 50, L + `band scrolls sideways (scrollWidth ${pf.sw} > ${pf.cw})`);
    ok(pf.firstH > pf.th * 0.9, L + 'first tile is big (spans both rows)');
    ok(pf.asp.every(([t, n]) => !n || Math.abs(t - n) / n < 0.04), L + 'every tile keeps its natural aspect ratio (tile:image ' + pf.asp.map(a => a.join(':')).join(' ') + ')');
    ok(/gradient/.test(pf.mask || ''), L + 'edge fades present');
    await shot(p, mob ? 'mobile-portfolio.png' : 'portfolio-desktop.png');
    let x0 = await p.$eval('#pfScroll', s => s.scrollLeft);
    if (!mob) {
      const bx = await p.$eval('#pfScroll', s => { const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await p.click('#pfNext'); await p.waitForTimeout(900);
      const x1 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x1 > x0 + 50, L + `next arrow scrolls (${x0} -> ${x1})`);
      await p.mouse.move(...bx); await p.mouse.wheel(0, -600); await p.waitForTimeout(900);
      const x2 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x2 < x1 - 50, L + `mouse wheel scrolls the band sideways (${x1} -> ${x2})`);
      await p.mouse.wheel(0, 600); await p.waitForTimeout(900);
      await p.$eval('#pfScroll', s => s.scrollLeft = 0); await p.mouse.move(2, 2); await p.waitForTimeout(600);
    } else {
      const s = await p.$eval('#pfScroll', s => { const r = s.getBoundingClientRect(); return { y: r.top + r.height / 2 }; });
      const cdp = await c.newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y: s.y }] });
      for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 330 - k * 30, y: s.y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(900);
      const x1 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x1 > x0 + 100, L + `touch swipe scrolls the band (${x0} -> ${x1})`);
      await p.$eval('#pfScroll', s => s.scrollLeft = 0); await p.waitForTimeout(300);
    }
    // likes + views
    const likeHits = hits.length; await p.click('.brick .like'); await p.waitForTimeout(500);
    ok(await p.$eval('.brick .like', b => b.getAttribute('aria-pressed')) === 'true' && hits.length > likeHits, L + 'like on portfolio overlay works (counter called)');
    await p.click('.brick .like'); await p.waitForTimeout(300);   // un-like
    // viewer
    await p.click('.brick:nth-child(2) .brick-btn, .brick:nth-child(2) img', { position: { x: 30, y: 30 } }).catch(() => p.click('.brick:nth-child(2)'));
    await p.waitForTimeout(1200);
    const lb = await p.evaluate(() => ({ open: document.querySelector('#lb').classList.contains('open'), idx: document.querySelector('#lbIdx').textContent, title: document.querySelector('#lbTitle').textContent,
      orig: [...document.querySelectorAll('#lbTrack img')].some(i => /images\/artworks\//.test(i.currentSrc) && !/thumbs\//.test(i.currentSrc)), tint: getComputedStyle(document.querySelector('#lbTint')).backgroundColor }));
    ok(lb.open && /2\s*\/\s*9/.test(lb.idx), L + `viewer opens on clicked artwork (${lb.idx} "${lb.title}")`);
    ok(lb.orig, L + 'viewer shows full-res original');
    ok(hits.some(u => /view/.test(u)), L + 'view counted');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
    ok(/3\s*\/\s*9/.test(await p.$eval('#lbIdx', e => e.textContent)), L + 'viewer next works');
    await shot(p, `_viewer-${tag}.png`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(900); if (mob) await p.click('#lbClose').catch(() => {});
    ok(!(await p.$eval('#lb', e => e.classList.contains('open'))), L + 'viewer closes');
    // albums
    await go(p, '#albums'); await p.waitForTimeout(800);
    ok(/Test✨/.test(await p.$eval('#albumGrid', e => e.innerText)), L + 'her "Test✨" album is listed');
    await p.click('.album-tile'); await p.waitForTimeout(1600);
    ok(await p.$eval('#av', e => e.classList.contains('open')), L + 'album opens');
    const am = await p.evaluate(() => ({ src: document.querySelector('#albumAudio').getAttribute('src'), playing: !document.querySelector('#albumAudio').paused, bg: document.querySelector('#bgAudio').paused }));
    ok(!am.src || (am.playing), L + 'album music ' + (am.src ? 'plays (' + am.src.split('/').pop() + ')' : 'n/a (album has none)'));
    await p.click('#avClose'); await p.waitForTimeout(900);
    // music
    const mus = await p.evaluate(() => ({ shown: !document.querySelector('#musicBtn').hidden, src: document.querySelector('#bgAudio').src }));
    ok(mus.shown && /audio\//.test(mus.src), L + 'music toggle shown by the logo with her track ' + mus.src.split('/').pop());
    const isOn = () => p.evaluate(() => !document.querySelector('#bgAudio').paused && document.querySelector('#musicBtn').getAttribute('aria-pressed') === 'true');
    const before = await isOn();   // music is on by default and starts with the first interaction (unchanged behaviour)
    await p.click('#musicBtn'); await p.waitForTimeout(1200); const mid = await isOn();
    await p.click('#musicBtn'); await p.waitForTimeout(1200); const after = await isOn();
    ok(before && !mid && after, L + `music toggle flips background music (playing ${before} -> ${mid} -> ${after})`);
    // commissions slideshow
    await p.evaluate(() => document.querySelector('#tiers').scrollIntoView({ behavior: 'instant', block: 'center' })); await p.mouse.move(2, 2); await p.waitForTimeout(400);
    const tiers = await p.$$eval('.tier', t => t.map(x => x.querySelector('h3, .tier-name')?.textContent.trim()));
    ok(tiers.length === 3, L + 'tiers: ' + tiers.join(' | '));
    const cur = () => p.$$eval('.tier', t => t.findIndex(x => x.classList.contains('on')));
    const t0 = Date.now(), a = await cur(); let changed = -1;
    while (Date.now() - t0 < 7500) { await p.waitForTimeout(100); if ((await cur()) !== a) { changed = Date.now() - t0; break; } }
    await p.waitForTimeout(650); await shot(p, mob ? '_mobile-commissions-mid.png' : 'commissions-mid-transition-desktop.png');
    ok(changed > 0, L + `tier auto-advanced after ~${(changed / 1000).toFixed(1)} s of watching (cycle 5 s)`);
    const gaps = await p.evaluate(() => new Promise(res => { const ts = [], st = document.querySelector('#tiersStage');
      const mo = new MutationObserver(() => { const k = [...st.children].findIndex(x => x.classList.contains('on')); if (k !== ts.at(-1)?.k) ts.push({ k, t: performance.now() }); });
      mo.observe(st, { subtree: true, attributes: true, attributeFilter: ['class'] }); setTimeout(() => { mo.disconnect(); res(ts.slice(1).map((x, i) => Math.round(x.t - ts[i].t))); }, 11500); }));
    ok(gaps.length >= 1 && gaps.every(g => g > 4700 && g < 5300), L + `tiers rotate every ${gaps.map(g => (g / 1000).toFixed(2) + ' s').join(', ')}`);
    await p.waitForTimeout(2200); await shot(p, mob ? 'mobile-commissions.png' : 'commissions-desktop.png');
    if (!mob) {   // hover pauses
      const box = await p.$eval('#tiersStage', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + 40]; });
      await p.mouse.move(...box); const k = await cur(); await p.waitForTimeout(6000);
      ok((await cur()) === k, L + 'hover pauses the slideshow'); await p.mouse.move(2, 2);
      await p.click('#tNext'); await p.waitForTimeout(300); ok((await cur()) === (k + 1) % 3, L + 'next button works');
      await p.click('#tDots .t-dot:first-child'); await p.waitForTimeout(300); ok((await cur()) === 0, L + 'dots work');
    }
    // nav anchors
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
    if (mob) { await p.click('#menuBtn'); await p.waitForTimeout(400); }
    await p.click('#menu a[href="#commissions"]'); await p.waitForTimeout(1400);
    ok(Math.abs(await p.$eval('#commissions', e => e.getBoundingClientRect().top)) < 120, L + 'nav link scrolls to Commissions');
    ok(errs.length === 0, L + 'no console errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
    await c.close();
  }
  // reduced motion: no auto-advance
  { const { c, p, errs } = await ctx(b, 1440, 900, false); await c.close(); }
  const rc = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const rp = await rc.newPage();
  await rp.goto(BASE, { waitUntil: 'load' }); await go(rp, '#commissions'); await rp.waitForTimeout(6500);
  ok(await rp.$$eval('.tier', t => t.findIndex(x => x.classList.contains('on'))) === 0, '[reduced motion] tiers stay put'); await rc.close();
  // sub-path
  { const { c, p, errs } = await ctx(b, 1440, 900, false);
    await p.goto(SUB, { waitUntil: 'load' }); await p.waitForTimeout(2500); await go(p, '#commissions'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ hero: document.querySelector('#heroImg').naturalWidth, bricks: [...document.querySelectorAll('.brick img')].filter(i => i.complete && i.naturalWidth).length, tier: [...document.querySelectorAll('.tier img')].filter(i => i.naturalWidth).length }));
    ok(r.hero > 0 && r.bricks >= 6 && r.tier >= 1 && !errs.length, `[sub-path ${SUB}] hero, ${r.bricks} tiles, tier images load` + (errs.length ? ' errors: ' + errs.join(' || ') : ''));
    await c.close(); }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
