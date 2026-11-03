// Local end-to-end check of the portfolio site (Playwright + system Chrome). Not deployed.
// 1) bash scripts/make_test_site.sh && bash scripts/build_local.sh
// 2) serve /tmp/yaz-test-site on :8091 and /tmp/yaz-build/sub on :8092
// 3) node scripts/check.js [baseURL]   -> screenshots in ./screenshots (gitignored), named r5-*.png
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:8091/';
const SUB = process.env.SUB || 'http://localhost:8092/yazarts/';
const OUT = path.join(__dirname, '..', 'screenshots'); fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n, o = {}) => p.screenshot({ path: path.join(OUT, n), ...o });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function ctx(b, w, h, mob, extra = {}) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1, ...extra });
  const hits = []; c.on('request', r => { if (/abacus/.test(r.url())) hits.push(r.url()); });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  p.on('requestfailed', r => { const t = r.failure()?.errorText || ''; if (/fonts\./.test(r.url()) || (/ERR_ABORTED/.test(t) && /\.(mp3|m4a|ogg|wav)$/.test(r.url()))) return; errs.push('request failed ' + r.url() + ' ' + t); });
  return { c, p, errs, hits };
}
const go = (p, sel, block = 'start') => p.evaluate(([s, b]) => document.querySelector(s).scrollIntoView({ behavior: 'instant', block: b }), [sel, block]);
// frame pacing while the band scrolls: longest gap between animation frames + any layout shift inside the band
const smooth = (p) => p.evaluate(() => new Promise(res => {
  const s = document.querySelector('#pfScroll'), b0 = [...document.querySelectorAll('.brick')].map(b => b.style.left + b.style.top + b.style.width);
  const gaps = []; let last = performance.now(), t0 = last;
  const f = (t) => { gaps.push(t - last); last = t; if (t - t0 < 1500) requestAnimationFrame(f); else {
    const b1 = [...document.querySelectorAll('.brick')].map(b => b.style.left + b.style.top + b.style.width);
    res({ max: Math.max(...gaps.slice(2)), avg: gaps.reduce((a, c) => a + c, 0) / gaps.length, shifted: b0.join() !== b1.join(), x: s.scrollLeft }); } };
  requestAnimationFrame(f);
  let x = 0; const iv = setInterval(() => { x += 18; s.scrollLeft = x; if (x > 1400) clearInterval(iv); }, 16);
}));

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h, mob, tag] of [[1280, 800, false, 'desktop'], [1024, 1366, true, 'ipad'], [390, 844, true, 'mobile']]) {
    const L = `[${tag} ${w}x${h}] `;
    const { c, p, errs, hits } = await ctx(b, w, h, mob);
    await p.goto(BASE, { waitUntil: 'load' }); await p.mouse.move(2, 2).catch(() => {}); await p.waitForTimeout(2800);

    // ---- welcome
    const hero = await p.evaluate(() => {
      const i = document.querySelector('#heroImg'), t = document.querySelector('.hero-text'), bg = document.querySelector('#heroBg'), H = document.querySelector('#home');
      const r = i.getBoundingClientRect(), tr = t.getBoundingClientRect(), hr = H.getBoundingClientRect(), br = bg.getBoundingClientRect();
      return { png: i.complete && /\.png/.test(i.currentSrc), imgL: r.left, imgR: r.right, imgB: r.bottom, txtL: tr.left, txtR: tr.right, txtT: tr.top, W: innerWidth,
        bgOk: bg.complete && bg.naturalWidth > 0 && H.classList.contains('bg-ok'), bgSrc: bg.currentSrc, cover: br.width >= hr.width - 1 && br.height >= hr.height - 1 && getComputedStyle(bg).objectFit === 'cover',
        heroBg: getComputedStyle(H).backgroundImage, text: t.innerText, nav: [...document.querySelectorAll('#menu a')].map(a => a.textContent).join('|') };
    });
    ok(hero.png, L + 'floating cut-out PNG loaded');
    ok(mob && w < 720 ? hero.imgB <= hero.txtT + 5 : hero.imgR <= hero.txtL + 5 && hero.imgL < hero.W * 0.25 && hero.txtR > hero.W * 0.8, L + (mob && w < 720 ? 'phone: image stacked above the text' : `image on the LEFT (${Math.round(hero.imgL)}-${Math.round(hero.imgR)}), text on the RIGHT (${Math.round(hero.txtL)}-${Math.round(hero.txtR)})`));
    ok(hero.bgOk && hero.cover, L + 'background illustration covers the whole hero (' + hero.bgSrc.split('/').slice(-2).join('/') + ')');
    ok(!/#8a5a3b|138, 90, 59|108, 68, 45/.test(hero.heroBg), L + 'old brown/orange gradient is gone');
    ok(!/Digital art and illustrations/i.test(hero.text) && !/To my portfolio/i.test(hero.text), L + 'removed "Digital art and illustrations by…" and "To my portfolio"');
    ok(/Hi there! I'm yazarts! A self-taught digital artist based in/.test(hero.text) && /See more/.test(hero.text) && /See my work/.test(hero.text), L + 'intro line + See more + See my work shown');
    ok(hero.nav === 'Home|Portfolio|Commissions|Contact', L + 'nav: ' + hero.nav);
    ok(!(await p.$('#about, #albums, #connect, #av, .album-grid')), L + 'About, Albums and old Connect sections removed');
    await shot(p, `r5-hero-${tag}.png`);

    // ---- See more (bio)
    await p.click('#bioBtn'); await p.waitForTimeout(1600);
    const bio1 = await p.evaluate(() => ({ open: !document.querySelector('#bio').hidden && document.querySelector('#bio').classList.contains('open'), n: document.querySelector('#bioText').textContent.length,
      full: document.querySelector('#bioFull').textContent.length, caret: !!document.querySelector('#bioText .caret'),
      photo: (() => { const i = document.querySelector('#bioPhoto'), r = i.getBoundingClientRect(), t = document.querySelector('#bioText').getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, side: r.right <= t.left + 2, above: r.bottom <= t.top + 2 }; })() }));
    ok(bio1.open && bio1.n > 5 && bio1.n < bio1.full && bio1.caret, L + `See more opens the bio and it is typing (${bio1.n}/${bio1.full} chars, cursor shown)`);
    ok(bio1.photo.ok && (w >= 720 ? bio1.photo.side : bio1.photo.above), L + 'bio photo ' + (w >= 720 ? 'beside' : 'above') + ' the text');
    await shot(p, `r5-bio-open-${tag}.png`);
    await p.waitForTimeout(700);
    const n2 = await p.$eval('#bioText', e => e.textContent.length); ok(n2 > bio1.n, L + `text keeps streaming (${bio1.n} -> ${n2})`);
    await p.click('#bioSkip'); await p.waitForTimeout(200);
    ok(await p.$eval('#bioText', e => e.textContent.length) === bio1.full, L + '"Show all" completes the text');
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    ok(await p.$eval('#bio', e => e.hidden), L + 'bio closes (Esc)');
    await p.click('#bioBtn'); await p.waitForTimeout(500); await p.click('#bioClose'); await p.waitForTimeout(600);
    ok(await p.$eval('#bio', e => e.hidden) && await p.evaluate(() => document.body.style.overflow === ''), L + 'bio closes (X) and page scroll is unlocked');

    // ---- portfolio
    await go(p, '#portfolio'); await p.waitForTimeout(1800);
    const pf = await p.evaluate(() => { const s = document.querySelector('#pfScroll'), bs = [...document.querySelectorAll('.brick')];
      const tr = document.querySelector('#pfTrack').getBoundingClientRect();
      const rat = bs.map(x => +(x.offsetWidth / x.offsetHeight).toFixed(2));
      return { n: bs.length, sw: s.scrollWidth, cw: s.clientWidth, th: tr.height, rows: new Set(bs.filter(x => !x.classList.contains('big')).map(x => x.style.top)).size,
        big: bs.filter(x => x.classList.contains('big')).length, rat, fit: bs.every(x => getComputedStyle(x.querySelector('img')).objectFit === 'cover'),
        head: !!document.querySelector('#portfolio h2, #portfolio .rule'), meta: !!document.querySelector('#portfolio .like, #portfolio .views, #portfolio .cap'),
        mask: (getComputedStyle(s).maskImage || getComputedStyle(s).webkitMaskImage || 'none'), snap: getComputedStyle(s).scrollSnapType };
    });
    ok(!pf.head, L + 'no "Portfolio" heading or divider line');
    ok(!pf.meta, L + 'no likes, views or titles on tiles');
    ok(pf.sw > pf.cw + 50, L + `band scrolls sideways (${pf.sw} > ${pf.cw})`);
    ok(pf.rows === 2 && pf.big >= (w >= 720 ? 1 : 0), L + `two rows of bricks + ${pf.big} big tile(s)`);
    ok(pf.th >= Math.min(w >= 1000 ? h * 0.7 : 330, 880), L + `rows are tall: band ${Math.round(pf.th)} px of a ${h} px viewport`);
    const kinds = [pf.rat.some(r => r > 1.2), pf.rat.some(r => r > 0.9 && r < 1.1), pf.rat.some(r => r < 0.86)];
    ok(kinds.every(Boolean) && pf.fit, L + 'varied tile shapes (wide, square, tall) cropped with object-fit:cover: ' + pf.rat.join(' '));
    ok(pf.mask === 'none' && (pf.snap === 'none' || !pf.snap), L + 'no mask-image / scroll-snap on the scroller');
    await shot(p, `r5-portfolio-${tag}.png`);
    const sm = await smooth(p);
    ok(sm.max < 60 && !sm.shifted, L + `scrolling the band: longest frame ${sm.max.toFixed(1)} ms (avg ${sm.avg.toFixed(1)}), no tile moved: ${!sm.shifted}`);
    await p.$eval('#pfScroll', s => s.scrollLeft = 0); await p.waitForTimeout(300);
    let x0 = await p.$eval('#pfScroll', s => s.scrollLeft);
    if (!mob) {
      await p.click('#pfNext'); await p.waitForTimeout(900);
      const x1 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x1 > x0 + 50, L + `next arrow scrolls (${x0} -> ${x1})`);
      const bx = await p.$eval('#pfScroll', s => { const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await p.mouse.move(...bx); await p.mouse.wheel(0, -300); await p.waitForTimeout(900);
      const x2 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x2 < x1 - 50, L + `mouse wheel scrolls the band sideways (${x1} -> ${x2})`);
      // drag with the mouse
      await p.$eval('#pfScroll', s => s.scrollLeft = 0); await p.waitForTimeout(200);
      await p.mouse.move(bx[0] + 200, bx[1]); await p.mouse.down(); for (let k = 1; k <= 10; k++) await p.mouse.move(bx[0] + 200 - k * 30, bx[1]); await p.mouse.up(); await p.waitForTimeout(900);
      const x3 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x3 > 200, L + `mouse drag scrolls (${x3})`);
      ok(!(await p.$eval('#lb', e => !e.hidden)), L + 'a drag does not open the viewer');
      await p.$eval('#pfScroll', s => s.scrollLeft = 0); await p.mouse.move(2, 2); await p.waitForTimeout(400);
    } else {
      const sy = await p.$eval('#pfScroll', s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
      const cdp = await c.newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w - 40, y: sy }] });
      for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: w - 40 - k * 25, y: sy }] }); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(1000);
      const x1 = await p.$eval('#pfScroll', s => s.scrollLeft); ok(x1 > x0 + 100, L + `touch swipe scrolls the band natively (${x0} -> ${x1})`);
      ok(!(await p.$eval('#lb', e => !e.hidden)), L + 'a swipe does not open the viewer');
      await p.$eval('#pfScroll', s => s.scrollLeft = 0); await p.waitForTimeout(300);
    }

    // ---- viewer
    await p.click('.brick[data-i="1"] .tile'); await p.waitForTimeout(1300);
    const lb = await p.evaluate(() => { const L = document.querySelector('#lb'), im = document.querySelector('.lb-slide:not([aria-hidden="true"]) img') || [...document.querySelectorAll('#lbTrack img')][1];
      const cur = [...document.querySelectorAll('.lb-slide')].find(s => s.getAttribute('aria-hidden') === 'false').querySelector('img');
      return { open: L.classList.contains('open'), live: document.querySelector('#lbLive').textContent, src: cur.currentSrc, nat: [cur.naturalWidth, cur.naturalHeight],
        box: [cur.getBoundingClientRect().width, cur.getBoundingClientRect().height], text: L.innerText.trim(), meta: !!L.querySelector('.like, .views, .lb-title, .lb-cap, .lb-panel') }; });
    ok(lb.open && /Artwork 2 of/.test(lb.live), L + 'tap opens the viewer on that artwork');
    ok(/images\/artworks\//.test(lb.src) && !/thumbs\//.test(lb.src) && lb.nat[0] > 1500, L + `viewer loads the full-res original ${lb.src.split('/').pop()} (${lb.nat.join('x')})`);
    ok(Math.abs(lb.box[0] / lb.box[1] - lb.nat[0] / lb.nat[1]) < 0.02, L + 'shown uncropped (aspect matches the file)');
    ok(!lb.meta && lb.text === 'Artwork 2 of ' + lb.live.split(' of ')[1], L + 'no title / caption / likes / views in the viewer');
    await shot(p, `r5-viewer-${tag}.png`);
    if (mob) { await p.click('#lbClose'); } else { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600); ok(/Artwork 3 of/.test(await p.$eval('#lbLive', e => e.textContent)), L + 'arrow key goes to the next piece'); await p.click('#lbNext'); await p.waitForTimeout(600); await p.keyboard.press('Escape'); }
    await p.waitForTimeout(900);
    ok(await p.$eval('#lb', e => e.hidden), L + 'viewer closes');
    ok(hits.length === 0, L + 'no like/view counter requests (counter code removed)');

    // ---- commissions
    await go(p, '#tiers', 'center'); await p.mouse.move(2, 2).catch(() => {}); await p.waitForTimeout(2600);
    const tiers = await p.$$eval('.tier', t => t.map(x => x.querySelector('.tier-name')?.textContent.trim()));
    ok(tiers.length === 3, L + 'tiers: ' + tiers.join(' | '));
    const curTier = () => p.$$eval('.tier', t => t.findIndex(x => x.classList.contains('on')));
    const k0 = await curTier();
    await p.click(`.tier.on .tier-open`); await p.waitForTimeout(1300);
    const tv = await p.evaluate(() => { const cur = [...document.querySelectorAll('.lb-slide')].find(s => s.getAttribute('aria-hidden') === 'false').querySelector('img'); return { open: !document.querySelector('#lb').hidden, src: cur.currentSrc, live: document.querySelector('#lbLive').textContent }; });
    ok(tv.open && /images\/examples\//.test(tv.src) && !/thumbs\//.test(tv.src), L + `tapping a tier image opens it full screen (${tv.src.split('/').pop()}, ${tv.live})`);
    if (!mob) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700); }
    await p.click('#lbClose'); await p.waitForTimeout(900);
    if (!mob) ok(await curTier() === (k0 + 1) % 3, L + 'closing the viewer leaves the slideshow on the example last viewed');
    await go(p, '#contact', 'center'); await p.waitForTimeout(700);
    const cb = await p.evaluate(() => { const b = document.querySelector('#contactBtn'), cta = document.querySelector('.hero-cta'), bs = getComputedStyle(b), cs = getComputedStyle(cta);
      return { label: b.textContent.trim(), same: bs.borderRadius === cs.borderRadius && bs.borderTopColor === cs.borderTopColor && bs.fontFamily === cs.fontFamily, expanded: b.getAttribute('aria-expanded'),
        h: document.querySelector('.contact-inner').getBoundingClientRect().height, below: b.getBoundingClientRect().top > document.querySelector('#tiers').getBoundingClientRect().bottom }; });
    ok(cb.label === "Not quite what you're looking for?" && cb.same && cb.below, L + 'pill button "' + cb.label + '" under the slides, styled like "See my work"');
    await p.click('#contactBtn'); await p.waitForTimeout(900);
    const icons = await p.evaluate(() => ({ text: document.querySelector('#contactText').textContent, links: [...document.querySelectorAll('#socials a')].map(a => a.href), h: document.querySelector('.contact-inner').getBoundingClientRect().height }));
    ok(cb.h < 2 && icons.h > 60 && icons.text === 'Contact me directly via:', L + 'button reveals "Contact me directly via:" + icons');
    const want = ['instagram.com/yazarts', 'tiktok.com/@yaz.arts', 'reddit.com/user/yaz_arts', 'ko-fi.com/yazarts'];
    ok(want.every(u => icons.links.some(l => l.includes(u))), L + 'icons link to ' + icons.links.join(', '));
    await go(p, '#commissions'); await p.waitForTimeout(500);
    await (await p.$('#commissions')).screenshot({ path: path.join(OUT, `r5-commissions-${tag}.png`) });
    if (!mob) { await go(p, '#contact', 'end'); await p.waitForTimeout(300); await shot(p, `r5-contact-${tag}.png`); }

    // ---- music + nav
    const mus = await p.evaluate(() => ({ shown: !document.querySelector('#musicBtn').hidden, src: document.querySelector('#bgAudio').src }));
    ok(mus.shown && /audio\//.test(mus.src), L + 'soft blue music toggle by the logo with ' + mus.src.split('/').pop());
    const isOn = () => p.evaluate(() => !document.querySelector('#bgAudio').paused);
    const m0 = await isOn(); await p.click('#musicBtn'); await p.waitForTimeout(900); const m1 = await isOn(); await p.click('#musicBtn'); await p.waitForTimeout(900); const m2 = await isOn();
    ok(m0 && !m1 && m2, L + `music toggle works (${m0} -> ${m1} -> ${m2})`);
    await p.evaluate(() => { window.scrollTo(0, 0); document.querySelector('#contact').classList.remove('open'); }); await p.waitForTimeout(400);
    if (w < 720) { await p.click('#menuBtn'); await p.waitForTimeout(400); }
    await p.click('#menu a[href="#contact"]'); await p.waitForTimeout(1400);
    const ct = await p.evaluate(() => ({ open: document.querySelector('#contact').classList.contains('open'), top: document.querySelector('#contact').getBoundingClientRect().top }));
    ok(ct.open && ct.top < h, L + 'nav "Contact" scrolls to the commissions contact block and opens it');
    if (tag === 'mobile') { await go(p, '#home'); await p.waitForTimeout(300); }
    ok(errs.length === 0, L + 'no console errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
    await c.close();
  }
  // no background illustration -> calm navy space background
  { const { c, p, errs } = await ctx(b, 1280, 800, false);
    await p.route('**/content/welcome.json', async r => { const res = await r.fetch(); const j = await res.json(); delete j.heroBackground; r.fulfill({ json: j }); });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200);
    const r = await p.evaluate(() => ({ cls: document.querySelector('#home').className, bg: getComputedStyle(document.querySelector('#home')).backgroundImage }));
    ok(/no-bg/.test(r.cls) && /radial-gradient/.test(r.bg) && !/138, 90, 59/.test(r.bg), '[no background set] calm dark navy space background');
    await shot(p, 'r5-hero-no-background-desktop.png'); ok(!errs.length, '[no background set] no errors ' + errs.join(' ')); await c.close(); }
  // reduced motion: tiers stay put, bio appears at once
  { const rc = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const rp = await rc.newPage();
    await rp.goto(BASE, { waitUntil: 'load' }); await rp.waitForTimeout(800); await rp.click('#bioBtn'); await rp.waitForTimeout(200);
    ok(await rp.evaluate(() => document.querySelector('#bioText').textContent.length === document.querySelector('#bioFull').textContent.length), '[reduced motion] bio text shown at once');
    await rp.keyboard.press('Escape'); await go(rp, '#commissions'); await rp.waitForTimeout(6000);
    ok(await rp.$$eval('.tier', t => t.findIndex(x => x.classList.contains('on'))) === 0, '[reduced motion] tiers stay put'); await rc.close(); }
  // sub-path
  { const { c, p, errs } = await ctx(b, 1280, 800, false);
    await p.goto(SUB, { waitUntil: 'load' }); await p.waitForTimeout(2500); await go(p, '#commissions'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ hero: document.querySelector('#heroImg').naturalWidth, bg: document.querySelector('#heroBg').naturalWidth, bricks: [...document.querySelectorAll('.brick img')].filter(i => i.complete && i.naturalWidth).length, tier: [...document.querySelectorAll('.tier img')].filter(i => i.naturalWidth).length }));
    ok(r.hero > 0 && r.bg > 0 && r.bricks >= 6 && r.tier >= 1 && !errs.length, `[sub-path ${SUB}] hero, background, ${r.bricks} tiles, tier images load` + (errs.length ? ' errors: ' + errs.join(' || ') : ''));
    await c.close(); }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
