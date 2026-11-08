// Local end-to-end check of the portfolio site (Playwright + system Chrome). Not deployed.
// 1) bash scripts/make_test_site.sh && bash scripts/build_local.sh
// 2) serve /tmp/yaz-test-site on :8091 and /tmp/yaz-build/sub on :8092
// 3) node scripts/check.js [baseURL]   -> screenshots in ./screenshots (gitignored), named r5-*.png and r6-*.png
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
  const root = path.join(__dirname, '..');
  const commFile = JSON.parse(fs.readFileSync(path.join(root, 'content/commissions.json'), 'utf8'));
  const contactFile = JSON.parse(fs.readFileSync(path.join(root, 'content/contact.json'), 'utf8'));
  const welcomeFile = JSON.parse(fs.readFileSync(path.join(root, 'content/welcome.json'), 'utf8'));
  const pagesYml = fs.readFileSync(path.join(root, '.pages.yml'), 'utf8');
  const migrated = [
    ['Portraits', '/images/artworks/Untitled192.jpg', 'A head-and-shoulders portrait'],
    ['Half Body', '/images/examples/half-body-example.jpg', 'Your character from the waist up'],
    ['Full Body Character', '/images/examples/full-body-example.jpg', 'A full body illustration'],
    ['Animals', '/images/artworks/img1164.jpeg', ''],
  ];
  ok(commFile.tiers.length === migrated.length && !JSON.stringify(commFile).includes('"price"') && !JSON.stringify(commFile).includes('"image"'), 'published tiers keep names and a single migrated photo, with prices and the old image field gone');
  ok(migrated.every(([name, img, desc], i) => {
    const t = commFile.tiers[i];
    return t.name === name && Array.isArray(t.images) && t.images.length === 1 && t.images[0] === img && (desc ? t.description.startsWith(desc) : t.description == null);
  }), 'each existing tier photo was kept once: ' + commFile.tiers.map(t => t.name + ' ' + (t.images || []).join(',')).join(' | '));
  ok(contactFile.email === 'aitazouzabdellah@gmail.com' && contactFile.links.length === 4 && contactFile.links.some(l => l.url.includes('tiktok.com/@yaz.arts')) && !contactFile.links.some(l => /mail/i.test(l.label) || /gmail\.com|mailto:/i.test(l.url)), 'email field is the address already in the repo; social links are unchanged and not duplicated');
  ok(/name: images[\s\S]*multiple: true[\s\S]*unique: true/.test(pagesYml) && !/name: price/.test(pagesYml) && /name: email/.test(pagesYml) && /name: testimonial\b/.test(pagesYml) && /name: testimonialBy/.test(pagesYml), 'CMS edits photos, email and an optional testimonial, and has no price field');
  ok(commFile.open === true && commFile.testimonial == null && commFile.testimonialBy == null, 'commissions stay open and no testimonial was invented');
  ok(welcomeFile.bio.startsWith("I'm a self-taught digital artist. I started out drawing just for fun, filling sketchbooks") && welcomeFile.bio.includes('Thank you for stopping by!') && welcomeFile.bioTitle === 'A little about me', 'bio text and heading are the ones already saved');

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

    // ---- See more (bio): the whole story is present immediately and fades in
    await p.click('#bioBtn'); await p.waitForTimeout(60);
    const bio1 = await p.evaluate(() => {
      const text = document.querySelector('#bioText'), card = document.querySelector('.bio-card').innerText;
      const ps = [...text.querySelectorAll('p')].map(n => n.textContent);
      const photo = (() => { const i = document.querySelector('#bioPhoto'), r = i.getBoundingClientRect(), t = text.getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, side: r.right <= t.left + 2, above: r.bottom <= t.top + 2 }; })();
      return { open: !document.querySelector('#bio').hidden && document.querySelector('#bio').classList.contains('open'), ps, card, caret: !!document.querySelector('.caret'),
        kicker: !!document.querySelector('.bio-kicker'), skip: !!document.querySelector('#bioSkip, .bio-skip'), photo, op: getComputedStyle(text).opacity };
    });
    ok(bio1.open && bio1.ps.length >= 4 && bio1.ps[0].startsWith("I'm a self-taught digital artist") && bio1.ps.join('').includes('Thank you for stopping by'), L + `See more shows the complete story at once (${bio1.ps.length} paragraphs)`);
    ok(!bio1.caret && !bio1.kicker && !bio1.skip && !/journal/i.test(bio1.card) && !/show all/i.test(bio1.card), L + 'no cursor, no "Journal · about me", no "Show all"');
    ok(bio1.photo.ok && (w >= 720 ? bio1.photo.side : bio1.photo.above), L + 'bio photo ' + (w >= 720 ? 'beside' : 'above') + ' the text');
    await p.waitForTimeout(700);
    const bioOp = await p.$eval('#bioText', e => getComputedStyle(e).opacity);
    ok(Number(bioOp) > 0.95 && Number(bio1.op) < 0.98, L + `story fades in (opacity ${bio1.op} -> ${bioOp})`);
    await shot(p, `r6-bio-${tag}.png`);
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
    const tile = '.brick[data-i="1"] .tile';
    const tileBox = () => p.$eval(tile, el => { const r = el.getBoundingClientRect(), img = el.querySelector('img'); return { w: Math.round(r.width), h: Math.round(r.height), tr: getComputedStyle(img).transform, filter: getComputedStyle(el).filter, sh: getComputedStyle(el).boxShadow }; });
    const beforeH = await tileBox();
    await p.hover(tile).catch(() => {}); await p.waitForTimeout(350);
    const afterH = await tileBox();
    ok(afterH.w === beforeH.w && afterH.h === beforeH.h && (afterH.tr === 'none' || afterH.tr === 'matrix(1, 0, 0, 1, 0, 0)') && afterH.filter === 'none', L + 'hover does not resize, scale or blur the artwork');
    if (!mob) {
      ok(/111,\s*156,\s*196|156,\s*195,\s*230/.test(afterH.sh), L + 'fine pointer gets a soft blue glow');
      await (await p.$('.brick[data-i="1"]')).screenshot({ path: path.join(OUT, 'r6-hover-glow-desktop.png') });
    }
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

    // ---- commissions: multi-photo stack, single photo, no prices, viewer stays inside the tier
    await go(p, '#tiers', 'center'); await p.hover('#tiers').catch(() => {}); await p.waitForTimeout(400);
    await p.click('#tDots .t-dot[data-k="0"]'); await p.waitForTimeout(500);
    const tiers = await p.$$eval('.tier', t => t.map(x => x.querySelector('.tier-name')?.textContent.trim()));
    ok(tiers.length === 4 && tiers[0] === 'Portraits' && tiers[3] === 'Animals', L + 'tiers: ' + tiers.join(' | '));
    await go(p, '#comm-h', 'center'); await p.waitForTimeout(450);
    const badge = await p.$eval('#commKicker', e => ({ text: e.textContent.trim(), closed: e.classList.contains('closed'), radius: getComputedStyle(e).borderRadius }));
    ok(badge.text === 'Available for commissions' && !badge.closed && parseFloat(badge.radius) > 20, L + 'open state shows the Available badge');
    ok(await p.$eval('#quote', e => e.hidden), L + 'no testimonial until one is saved');
    const fade = await p.$eval('#commissions .section-head', e => ({ inn: e.classList.contains('in'), op: getComputedStyle(e).opacity, dur: parseFloat(getComputedStyle(e).transitionDuration), filter: getComputedStyle(e).filter }));
    ok(fade.inn && fade.op === '1' && fade.dur > 0 && fade.dur <= 0.45 && fade.filter === 'none', L + `section fade is fast (${fade.dur}s) and has no blur`);
    if (tag !== 'ipad') await (await p.$('.comm-top')).screenshot({ path: path.join(OUT, `r6-badge-${tag}.png`) });
    await go(p, '#tiers', 'center'); await p.waitForTimeout(200);
    const curTier = () => p.$$eval('.tier', t => t.findIndex(x => x.classList.contains('on')));
    const stack = await p.evaluate(() => {
      const t = document.querySelector('.tier.on');
      const cards = [...t.querySelectorAll('.card')];
      const box = t.querySelector('.tier-open').getBoundingClientRect();
      return { n: cards.length, multi: t.querySelector('.stack').classList.contains('multi'),
        srcs: cards.map(c => c.querySelector('img').getAttribute('src')),
        pos: cards.map(c => { const r = c.getBoundingClientRect(); return [Math.round(r.left - box.left), Math.round(r.top - box.top)]; }),
        price: !!document.querySelector('.tier-price'), text: document.querySelector('#tiers').innerText, desc: !!t.querySelector('.tier-desc') };
    });
    ok(stack.n === 3 && stack.multi && new Set(stack.srcs).size === 3 && stack.srcs[0].includes('Untitled192'), L + 'front photo is the existing portrait, two different photos peek behind: ' + stack.srcs.map(s => s.split('/').pop()).join(' '));
    const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    ok(gap(stack.pos[0], stack.pos[1]) > 24 && gap(stack.pos[0], stack.pos[2]) > 24, L + `stack layers are offset ${JSON.stringify(stack.pos)}`);
    ok(!stack.price && stack.desc && !/\$\s?\d|\d\s?\$/.test(stack.text), L + 'descriptions stay, no price tag is rendered');
    await (await p.$('#tiers')).screenshot({ path: path.join(OUT, `r6-tier-stack-${tag}.png`) });
    await p.click('.tier.on .card.c0'); await p.waitForTimeout(1400);
    const tv = await p.evaluate(() => { const cur = [...document.querySelectorAll('.lb-slide')].find(s => s.getAttribute('aria-hidden') === 'false').querySelector('img');
      return { open: !document.querySelector('#lb').hidden, src: cur.currentSrc, nat: [cur.naturalWidth, cur.naturalHeight], live: document.querySelector('#lbLive').textContent, one: document.querySelector('#lb').classList.contains('one') }; });
    ok(tv.open && !tv.one && /Artwork 1 of 3/.test(tv.live) && /Untitled192/.test(tv.src) && !/thumbs\//.test(tv.src) && tv.nat[0] > 800, L + `tap opens the original (${tv.src.split('/').pop()} ${tv.nat.join('x')}, ${tv.live})`);
    if (mob && w < 900) {
      const cdp = await c.newCDPSession(p);
      const y = Math.round(h / 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w - 24, y }] });
      for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: w - 24 - k * 36, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(800);
    const tv2 = await p.evaluate(() => { const cur = [...document.querySelectorAll('.lb-slide')].find(s => s.getAttribute('aria-hidden') === 'false').querySelector('img'); return { src: cur.currentSrc, live: document.querySelector('#lbLive').textContent }; });
    ok(/Artwork 2 of 3/.test(tv2.live) && /giant-girl-lake/.test(tv2.src) && !/thumbs\//.test(tv2.src) && tv2.src !== tv.src, L + `browse stays inside the tier (${tv2.src.split('/').pop()}, ${tv2.live})`);
    await shot(p, `r6-tier-viewer-${tag}.png`);
    await p.waitForTimeout(5200);
    ok(await curTier() === 0, L + 'carousel stays paused on this tier while the viewer is open');
    await p.click('#lbClose'); await p.waitForTimeout(900);
    ok(await curTier() === 0 && await p.$eval('#lb', e => e.hidden), L + 'closing the viewer leaves the slideshow on the same tier');
    await p.click('#tDots .t-dot[data-k="1"]'); await p.waitForTimeout(900);
    const single = await p.evaluate(() => { const t = document.querySelector('.tier.on'); return { name: t.querySelector('.tier-name').textContent.trim(), n: t.querySelectorAll('.card').length, multi: t.querySelector('.stack').classList.contains('multi'), desc: !!t.querySelector('.tier-desc') }; });
    ok(single.name === 'Half Body' && single.n === 1 && !single.multi && single.desc, L + 'a single uploaded photo is one picture, not a fake stack');
    await p.click('.tier.on .tier-open'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => document.querySelector('#lb').classList.contains('one') && /Artwork 1 of 1/.test(document.querySelector('#lbLive').textContent) && /half-body-example/.test(document.querySelector('.lb-slide[aria-hidden="false"] img').currentSrc)), L + 'one photo opens full screen with no extra slides');
    const soloSrc = await p.$eval('.lb-slide[aria-hidden="false"] img', e => e.currentSrc);
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
    ok(await p.$eval('.lb-slide[aria-hidden="false"] img', e => e.currentSrc) === soloSrc, L + 'arrow does not leave a single-photo tier');
    await p.click('#lbClose'); await p.waitForTimeout(700);
    if (!mob) {
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
      await p.mouse.move(2, 2); await p.waitForTimeout(400);
      const p0 = await p.$eval('.t-dot.on', e => parseFloat(e.style.getPropertyValue('--p')) || 0);
      await p.waitForTimeout(1400);
      const p1 = await p.$eval('.t-dot.on', e => parseFloat(e.style.getPropertyValue('--p')) || 0);
      ok(p1 > p0 + 0.15, L + `carousel runs again after the viewer closes (${p0.toFixed(2)} -> ${p1.toFixed(2)})`);
    }
    await go(p, '#contact', 'center'); await p.waitForTimeout(700);
    const cb = await p.evaluate(() => { const b = document.querySelector('#contactBtn'), cta = document.querySelector('.hero-cta'), bs = getComputedStyle(b), cs = getComputedStyle(cta);
      return { label: b.textContent.trim(), same: bs.borderRadius === cs.borderRadius && bs.borderTopColor === cs.borderTopColor && bs.fontFamily === cs.fontFamily, expanded: b.getAttribute('aria-expanded'),
        h: document.querySelector('.contact-inner').getBoundingClientRect().height, below: b.getBoundingClientRect().top > document.querySelector('#tiers').getBoundingClientRect().bottom }; });
    ok(cb.label === "Not quite what you're looking for?" && cb.same && cb.below, L + 'pill button "' + cb.label + '" under the slides, styled like "See my work"');
    await p.click('#contactBtn'); await p.waitForTimeout(900);
    const icons = await p.evaluate(() => ({ text: document.querySelector('#contactText').textContent, h: document.querySelector('.contact-inner').getBoundingClientRect().height,
      links: [...document.querySelectorAll('#socials a')].map(a => ({ href: a.getAttribute('href'), label: a.querySelector('.s-name').textContent, svg: a.querySelector('.ico svg').outerHTML, target: a.getAttribute('target') })) }));
    ok(cb.h < 2 && icons.h > 60 && icons.text === 'Contact me directly via:', L + 'button reveals "Contact me directly via:" + icons');
    const want = ['instagram.com/yazarts', 'tiktok.com/@yaz.arts', 'reddit.com/user/yaz_arts', 'ko-fi.com/yazarts'];
    const social = icons.links.filter(l => !l.href.startsWith('mailto:'));
    const mails = icons.links.filter(l => l.href.startsWith('mailto:'));
    ok(want.every(u => social.some(l => l.href.includes(u))) && social.every(l => l.target === '_blank'), L + 'social icons still open: ' + social.map(l => l.href).join(', '));
    ok(mails.length === 1 && mails[0].href === 'mailto:aitazouzabdellah@gmail.com' && mails[0].label === 'Email' && mails[0].target == null && /<rect /.test(mails[0].svg) && !/M10 14a5/.test(mails[0].svg), L + 'envelope mailto, not the chain icon, and the page does not send mail');
    ok(!icons.links.some(l => /https?:\/\/[^/]*@/.test(l.href)), L + 'the broken https:// email link is gone');
    await go(p, '#commissions'); await p.waitForTimeout(500);
    await (await p.$('#commissions')).screenshot({ path: path.join(OUT, `r5-commissions-${tag}.png`) });
    await go(p, '#contact', 'center'); await p.waitForTimeout(300); await shot(p, `r6-contact-${tag}.png`);

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
    ok(await rp.evaluate(() => { const t = document.querySelector('#bioText'); return t.textContent.includes("I'm a self-taught digital artist") && t.textContent.includes('Thank you for stopping by') && !document.querySelector('.caret, .bio-kicker, #bioSkip') && getComputedStyle(t).opacity === '1'; }), '[reduced motion] complete bio is shown at once, with no cursor');
    await rp.keyboard.press('Escape'); await go(rp, '#commissions'); await rp.waitForTimeout(6000);
    ok(await rp.$$eval('.tier', t => t.findIndex(x => x.classList.contains('on'))) === 0, '[reduced motion] tiers stay put'); await rc.close(); }
  // sub-path
  { const { c, p, errs } = await ctx(b, 1280, 800, false);
    await p.goto(SUB, { waitUntil: 'load' }); await p.waitForTimeout(2500); await go(p, '#commissions'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ hero: document.querySelector('#heroImg').naturalWidth, bg: document.querySelector('#heroBg').naturalWidth, bricks: [...document.querySelectorAll('.brick img')].filter(i => i.complete && i.naturalWidth).length, tier: [...document.querySelectorAll('.tier img')].filter(i => i.naturalWidth).length }));
    ok(r.hero > 0 && r.bg > 0 && r.bricks >= 6 && r.tier >= 4 && !errs.length, `[sub-path ${SUB}] hero, background, ${r.bricks} tiles, tier images load` + (errs.length ? ' errors: ' + errs.join(' || ') : ''));
    await c.close(); }
  // empty tier, legacy single image, duplicate path, and a price that must not render
  { const { c, p, errs } = await ctx(b, 1280, 800, false);
    await p.route('**/content/commissions.json', async r => { const res = await r.fetch(); const j = await res.json();
      j.tiers = [
        { name: 'Solo', images: ['/images/examples/half-body-example.jpg'], description: 'One image.' },
        { name: 'None yet', images: [], description: 'No photo yet.', notes: 'Text only.' },
        { name: 'Many', images: ['/images/artworks/giant-girl-lake.jpg', '/images/artworks/img1452.jpeg', '/images/artworks/img1504.jpeg', '/images/artworks/img1600.jpeg'], description: 'Several.' },
        { name: 'Legacy', image: '/images/artworks/img1164.jpeg', images: ['/images/artworks/img1164.jpeg'], price: '$999', description: 'Old shape.' },
      ];
      r.fulfill({ json: j }); });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1200); await go(p, '#tiers', 'center'); await p.hover('#tiers');
    const rows = await p.$$eval('.tier', t => t.map(el => ({ name: el.querySelector('.tier-name').textContent.trim(), cards: el.querySelectorAll('.card').length, multi: !!el.querySelector('.stack.multi'), empty: el.classList.contains('no-photos'), open: !!el.querySelector('.tier-open'), price: !!el.querySelector('.tier-price'), desc: el.querySelector('.tier-desc')?.textContent || '' })));
    ok(rows[0].name === 'Solo' && rows[0].cards === 1 && !rows[0].multi, '[empty/single] one image, no stack');
    ok(rows[1].name === 'None yet' && rows[1].empty && !rows[1].open && rows[1].desc === 'No photo yet.', '[empty/single] no photos: text only, nothing to tap');
    ok(rows[2].cards === 3 && rows[2].multi, '[empty/single] four photos still show three offset layers');
    ok(rows[3].name === 'Legacy' && rows[3].cards === 1 && !rows[3].multi && !rows[3].price && !/\$999|\$25|\$50|\$75/.test(await p.$eval('#tiers', e => e.innerText)), '[legacy] old image field is kept once and the price is not shown');
    await p.click('#tDots .t-dot[data-k="2"]'); await p.waitForTimeout(700);
    const peek = await p.evaluate(() => {
      const card = document.querySelector('.tier.on .card.c2'); if (!card) return null;
      const r = card.getBoundingClientRect();
      for (let y = r.top + 2; y < r.bottom - 2; y += 4) for (let x = r.left + 2; x < r.right - 2; x += 4) {
        const hit = document.elementFromPoint(x, y); if (hit && card.contains(hit)) return [x, y];
      }
      return null;
    });
    ok(!!peek, '[stack] a back photo stays visible to tap');
    if (peek) {
      await p.mouse.click(peek[0], peek[1]); await p.waitForTimeout(900);
      ok(/Artwork 3 of 4/.test(await p.$eval('#lbLive', e => e.textContent)) && /img1504/.test(await p.$eval('.lb-slide[aria-hidden="false"] img', e => e.currentSrc)), '[stack] tapping a back photo opens that photo');
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
      ok(/Artwork 4 of 4/.test(await p.$eval('#lbLive', e => e.textContent)) && /img1600/.test(await p.$eval('.lb-slide[aria-hidden="false"] img', e => e.currentSrc)) && !/thumbs\//.test(await p.$eval('.lb-slide[aria-hidden="false"] img', e => e.currentSrc)), '[stack] the fourth photo is in the viewer even though only three layers show');
      await p.click('#lbClose'); await p.waitForTimeout(400);
    }
    ok(!errs.length, '[empty/single] no errors ' + errs.join(' ')); await c.close(); }
  // email field: bare address, mailto with a query, empty, invalid, and a leftover social entry
  { const { c, p, errs } = await ctx(b, 390, 844, true);
    const cases = [
      [{ email: 'ada@example.com' }, 'mailto:ada@example.com'],
      [{ email: 'mailto:ada@example.com?subject=Hello' }, 'mailto:ada@example.com'],
      [{ email: '  ' }, null],
      [{ email: 'not an email' }, null],
      [{ email: '', linksExtra: [{ label: 'Email', url: 'https://someone@example.com' }] }, 'mailto:someone@example.com'],
      [{ email: 'kept@example.com', linksExtra: [{ label: 'Email', url: 'mailto:other@example.com' }] }, 'mailto:kept@example.com'],
    ];
    for (const [over, expectHref] of cases) {
      await p.unroute('**/content/contact.json').catch(() => {});
      await p.route('**/content/contact.json', async r => { const res = await r.fetch(); const j = await res.json();
        const extra = over.linksExtra || [];
        j.email = over.email; j.links = [...(j.links || []).filter(l => !/mail/i.test(l.label)), ...extra];
        r.fulfill({ json: j }); });
      await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(700);
      await p.click('#contactBtn'); await p.waitForTimeout(300);
      const got = await p.evaluate(() => [...document.querySelectorAll('#socials a')].map(a => ({ href: a.getAttribute('href'), svg: a.querySelector('svg').outerHTML, label: a.querySelector('.s-name').textContent })));
      const mails = got.filter(a => a.href.startsWith('mailto:'));
      const socials = got.filter(a => !a.href.startsWith('mailto:'));
      ok(expectHref ? mails.length === 1 && mails[0].href === expectHref && /<rect /.test(mails[0].svg) && mails[0].label === 'Email' : mails.length === 0, `[email ${JSON.stringify(over.email)}] ${expectHref || 'hidden'} (got ${mails.map(m => m.href).join(',') || 'none'})`);
      ok(socials.length === 4 && socials.map(a => a.label).join(',') === 'Instagram,TikTok,Reddit,Ko-fi' && mails.length === (expectHref ? 1 : 0), `[email ${JSON.stringify(over.email)}] socials stay and email is not listed twice`);
    }
    ok(!errs.length, '[email] no console errors ' + errs.join(' ')); await c.close(); }
  // a coarse pointer gets no glow and no size change; a fine pointer gets the glow only
  { const { c, p, errs } = await ctx(b, 1024, 1366, true);
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1200); await go(p, '#portfolio'); await p.waitForTimeout(600);
    const cdp = await c.newCDPSession(p);
    const measure = (sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), tr: getComputedStyle(el.querySelector('img')).transform, sh: getComputedStyle(el).boxShadow, mask: (getComputedStyle(document.querySelector('#pfScroll')).maskImage || 'none'), bf: getComputedStyle(document.querySelector('#pfScroll')).backdropFilter || 'none' }; });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] });
    const rest = await measure('.brick[data-i="1"] .tile');
    await p.hover('.brick[data-i="1"] .tile'); await p.waitForTimeout(250);
    const coarse = await measure('.brick[data-i="1"] .tile');
    ok(coarse.w === rest.w && coarse.h === rest.h && coarse.tr === rest.tr && coarse.sh === rest.sh && coarse.mask === 'none' && (coarse.bf === 'none' || coarse.bf === ''), '[touch] no hover glow, no resize, no mask or backdrop on the scroller');
    ok(!errs.length, '[hover] no errors ' + errs.join(' ')); await c.close(); }
  { const c = await b.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false }); const p = await c.newPage();
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    const vis = await p.evaluate(() => ({ js: document.documentElement.classList.contains('js'), hero: getComputedStyle(document.querySelector('.hero-text')).opacity, title: document.querySelector('#heroTitle').textContent, head: getComputedStyle(document.querySelector('#comm-h')).opacity, badge: document.querySelector('#commKicker').textContent.trim(), quote: document.querySelector('#quote').hidden }));
    ok(!vis.js && vis.hero === '1' && vis.head === '1' && vis.title === 'Welcome!' && vis.badge === 'Available for commissions' && vis.quote, '[no js] welcome, heading and badge stay visible; quote stays hidden');
    await c.close(); }
  { const { c, p, errs } = await ctx(b, 1280, 800, false);
    const fulfill = (mutate) => p.route('**/content/commissions.json', async r => { const j = await (await r.fetch()).json(); mutate(j); r.fulfill({ json: j }); });
    await fulfill(j => { j.open = false; j.testimonial = '   '; j.testimonialBy = 'Someone'; });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800); await go(p, '#commissions'); await p.waitForTimeout(300);
    const closed = await p.evaluate(() => ({ badge: document.querySelector('#commKicker').textContent.trim(), on: document.querySelector('#commKicker').classList.contains('closed'), quote: document.querySelector('#quote').hidden, text: document.querySelector('#commText').textContent }));
    ok(closed.badge === 'Commissions closed' && closed.on && closed.quote && /closed for now/.test(closed.text) && !/Commissions are open!/.test(closed.text), '[closed] badge and message follow the saved off switch; a blank quote stays hidden');
    await (await p.$('.comm-top')).screenshot({ path: path.join(OUT, 'r6-badge-closed-desktop.png') });
    await p.unroute('**/content/commissions.json');
    await fulfill(j => { j.open = true; j.testimonialBy = 'A Name I Made Up'; });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(700);
    ok(await p.$eval('#quote', e => e.hidden) && await p.$eval('#commKicker', e => e.textContent.trim()) === 'Available for commissions', '[testimonial] a name alone stays hidden and the open choice is unchanged');
    await p.unroute('**/content/commissions.json');
    await fulfill(j => { j.testimonial = 'The portrait felt like my character.'; j.testimonialBy = 'A commissioner'; });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(700); await go(p, '#quote', 'center'); await p.waitForTimeout(200);
    const q = await p.evaluate(() => ({ hidden: document.querySelector('#quote').hidden, text: document.querySelector('#quoteText').textContent, by: document.querySelector('#quoteBy').textContent, byHidden: document.querySelector('#quoteBy').hidden }));
    ok(!q.hidden && q.text === 'The portrait felt like my character.' && q.by === 'A commissioner' && !q.byHidden, '[testimonial] a saved quote and attribution are shown');
    await (await p.$('#quote')).screenshot({ path: path.join(OUT, 'r6-testimonial-when-set-desktop.png') });
    ok(!errs.length, '[badge/quote] no errors ' + errs.join(' ')); await c.close(); }
  { const { c, p, errs } = await ctx(b, 1280, 800, false);
    await p.goto(BASE, { waitUntil: 'load' });
    await p.evaluate(async () => {
      await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }));
    });
    await go(p, '#portfolio'); await p.waitForTimeout(700);
    const info = await p.evaluate(async () => {
      const manifest = await (await fetch('manifest.webmanifest')).json();
      const names = await caches.keys();
      const urls = [];
      for (const n of names) { const cache = await caches.open(n); for (const req of await cache.keys()) urls.push(req.url); }
      const sizes = {};
      for (const icon of manifest.icons) {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error(icon.src)); img.src = icon.src; });
        sizes[icon.src] = [img.naturalWidth, img.naturalHeight];
      }
      return { manifest, names, urls, sizes, installHidden: document.querySelector('#install').hidden, apple: !!document.querySelector('link[rel="apple-touch-icon"]') };
    });
    ok(info.manifest.name === 'yazarts' && info.manifest.short_name === 'yazarts' && info.manifest.display === 'standalone' && info.manifest.start_url === './' && info.apple, '[pwa] manifest is yazarts, standalone, with an Apple touch icon');
    const want = { 'assets/icons/icon-192.png': 192, 'assets/icons/icon-512.png': 512, 'assets/icons/icon-maskable-192.png': 192, 'assets/icons/icon-maskable-512.png': 512 };
    ok(Object.entries(want).every(([src, n]) => info.sizes[src] && info.sizes[src][0] === n && info.sizes[src][1] === n) && info.manifest.icons.some(i => i.purpose === 'any') && info.manifest.icons.some(i => i.purpose === 'maskable'), '[pwa] 192/512 any and maskable icons ' + JSON.stringify(info.sizes));
    ok(info.names.length && info.names.every(n => /^yazarts-(shell|content)-/.test(n)) && !info.urls.some(u => /\/images\/|\/audio\//.test(u)), '[pwa] cache skips artwork and music');
    const purged = await p.evaluate(async () => {
      const old = await caches.open('yazarts-shell-old');
      await old.put(new Request(location.origin + '/old-cache-probe'), new Response('stale'));
      await new Promise(r => { navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'purged') r(); }); navigator.serviceWorker.controller.postMessage('purge'); });
      return caches.keys();
    });
    ok(!purged.includes('yazarts-shell-old') && purged.every(n => /^yazarts-(shell|content)-1$/.test(n)), '[pwa] an older cache version is removed (' + purged.join(', ') + ')');
    ok(info.installHidden, '[pwa] Install stays hidden until the browser offers a prompt');
    await p.evaluate(() => dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
    ok(await p.$eval('#installBtn', b => !b.hidden && b.textContent.trim() === 'Install'), '[pwa] Install button appears for a supported prompt');
    await p.click('#installBtn');
    await c.setOffline(true);
    await p.goto(BASE + 'not-a-real-page', { waitUntil: 'domcontentloaded' }).catch(() => {});
    const off = await p.evaluate(() => document.body.innerText);
    ok(/internet connection is needed/i.test(off) && /not saved/i.test(off), '[pwa] offline text asks for a connection (' + off.replace(/\s+/g, ' ').slice(0, 160) + ')');
    ok(!errs.filter(e => !/not-a-real-page|Failed to fetch|net::ERR/.test(e)).length, '[pwa] no unexpected errors ' + errs.join(' || '));
    await c.close(); }
  for (const [w, h, ua, tag] of [
    [390, 844, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'iphone'],
    [1024, 1366, 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'ipad'],
  ]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: ua, deviceScaleFactor: 2 });
    const p = await c.newPage();
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(500);
    await go(p, 'footer', 'end'); await p.waitForTimeout(200);
    const inst = await p.evaluate(() => ({ box: document.querySelector('#install').hidden, btn: document.querySelector('#installBtn').hidden, text: document.querySelector('#installIos').textContent, ios: document.querySelector('#installIos').hidden }));
    ok(!inst.box && inst.btn && !inst.ios && /Share/.test(inst.text) && /Add to Home Screen/.test(inst.text) && /cannot install/i.test(inst.text), `[${tag}] Add to Home Screen instructions, no automatic install`);
    await shot(p, `r7-install-${tag}.png`);
    await c.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
