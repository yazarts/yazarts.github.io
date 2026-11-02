// Local check: validates content + .pages.yml, runs the site in headless Chrome and takes screenshots.
// The like counter API (Abacus) is MOCKED in the browser with an in-memory fake, so the tests never touch
// the real counters. Usage: npm run serve (other terminal), then: npm run check
const fs = require('fs'), path = require('path');
const yaml = require('js-yaml'); const { chromium } = require('playwright-core');
const root = path.join(__dirname, '..'); const SHOTS = path.join(root, 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:8090/';
const API = 'https://abacus.jasoncameron.dev', NS = 'yazartsgallery';
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('  ✓ ' + m); };

console.log('Content');
const pc = yaml.load(fs.readFileSync(path.join(root, '.pages.yml'), 'utf8')); ok(pc.content.length === 2, '.pages.yml parses (Gallery + Site settings only)');
const g = JSON.parse(fs.readFileSync(path.join(root, 'content/gallery.json'))); const s = JSON.parse(fs.readFileSync(path.join(root, 'content/site.json')));
ok(Array.isArray(g.artworks), 'gallery.json has artworks list');
ok(s.about === "Hi, I'm Yaz, a digital artist sharing my favourite pieces here.", 'about text');
ok(s.links.map(l => l.label).join() === 'Instagram,TikTok,Reddit,Ko-fi' && s.links[1].url === 'https://www.tiktok.com/@yaz.arts', 'links: Instagram, TikTok @yaz.arts, Reddit, Ko-fi');
ok(/Instagram|TikTok/.test(s.commissionText) && /Ko-fi/.test(s.commissionText) && /Instagram|TikTok/.test(s.commissionClosedText), 'commission messages point to the social links / Ko-fi');
for (const f of ['conversation.html', 'inbox.html', 'assets/backend.js', 'content/integrations.json', 'supabase', '.github/workflows/keepalive.yml']) ok(!fs.existsSync(path.join(root, f)), `removed: ${f}`);
const tracked = require('child_process').execSync('git ls-files', { cwd: root }).toString().split('\n').filter(f => /\.(html|js|css|json|yml|md)$/.test(f) && !/package-lock|scripts\/check\.js/.test(f));
const leftovers = tracked.filter(f => /USERNAME|supabase|web3forms|integrations\.json/i.test(fs.readFileSync(path.join(root, f), 'utf8')));
ok(leftovers.length === 0, 'no <USERNAME> placeholders or messaging/Supabase leftovers' + (leftovers.length ? ': ' + leftovers : ''));
for (const p of [...g.artworks.map(a => a.image), s.heroImage].filter(Boolean)) ok(fs.existsSync(path.join(root, p.replace(/^\//, ''))), `image exists: ${p}`);

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; const watch = (p) => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); };
  // fake Abacus: same URLs and responses as the real one (get → 404 for unknown keys, hit → +1)
  const counters = {}; const log = []; let mode = 'up';
  const seed = [14, 9, 23, 6, 11, 4, 17, 8];
  g.artworks.forEach((a, i) => { counters[`like-${a.image.split('/').pop().replace(/\.[a-z0-9]+$/i, '')}`] = seed[i % 8]; });
  const mockApi = async (c) => c.route(API + '/**', r => {
    const u = new URL(r.request().url()); const [, op, ns, key] = u.pathname.split('/'); log.push({ t: Date.now(), op, ns, key });
    if (mode === 'down') return r.abort('connectionrefused');
    if (mode === '429') return r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":"Too many requests. Try again in 2s"}' });
    const h = { 'access-control-allow-origin': '*' };
    if (ns !== NS || !/^[A-Za-z0-9_.-]{3,64}$/.test(key)) return r.fulfill({ status: 400, headers: h, contentType: 'application/json', body: '{"error":"bad key"}' });
    if (op === 'hit') { counters[key] = (counters[key] || 0) + 1; return r.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify({ value: counters[key] }) }); }
    if (op === 'get') return key in counters ? r.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify({ value: counters[key] }) }) : r.fulfill({ status: 404, headers: h, contentType: 'application/json', body: '{"error":"Key not found"}' });
    r.fulfill({ status: 404, headers: h, body: '' });
  });
  const ctx = async (opts) => { const c = await browser.newContext(opts); await mockApi(c); return c; };
  const settle = async (p) => { const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 350) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(90); }
    await p.waitForTimeout(1200); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700); };
  const key0 = 'like-' + g.artworks[0].image.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
  const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map(x => +x / 255); return (Math.max(...v) + Math.min(...v)) / 2; };
  const hue = (c) => { const [r, g2, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number), mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), dl = mx - mn || 1;
    const h = mx === r ? ((g2 - b) / dl) % 6 : mx === g2 ? (b - r) / dl + 2 : (r - g2) / dl + 4; return (h * 60 + 360) % 360; };
  const V = (p) => p.evaluate(() => { const cur = document.querySelector('.lb-slide[aria-hidden="false"]'), im = cur.querySelector('img'), m = new DOMMatrixReadOnly(getComputedStyle(im).transform);
    return { idx: document.querySelector('#lbIdx').textContent, off: new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#lbTrack')).transform).m41, scale: m.a,
      tint: getComputedStyle(document.querySelector('#lbTint')).backgroundColor, flyer: !!document.querySelector('.lb-flyer'), hidden: document.querySelector('#lb').hidden }; });
  const n = (loc) => loc.locator('.n').evaluate(e => e.hidden ? null : e.textContent);
  try {
    console.log('Desktop');
    const dc = await ctx({ viewport: { width: 1440, height: 900 } }); const d = await dc.newPage(); watch(d);
    await d.goto(BASE, { waitUntil: 'networkidle' }); await d.waitForTimeout(2600);
    await d.screenshot({ path: path.join(SHOTS, 'desktop-top.png') });
    ok(await d.locator('.tile').count() === g.artworks.length, 'all artworks render as tiles');
    ok(await d.locator('.card .like').count() === g.artworks.length, 'one heart under each piece');
    ok(await d.locator('#links a').count() === 4 && (await d.textContent('#links')).includes('@yaz.arts'), 'Connect: 4 social links incl. TikTok @yaz.arts');
    ok(await d.locator('#commStatus').isVisible() && /Instagram/.test(await d.textContent('#commText')), 'commission badge + message');
    ok(await d.locator('form, textarea, #contact, .comments, .m-view, .m-com').count() === 0, 'no contact form, comments or view counts on the page');
    await settle(d); await d.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });
    const card = d.locator('.card').nth(2), heart = card.locator('.like');
    ok(await n(heart) === '23', 'like count comes from the counter API');
    ok(log.some(l => l.op === 'get' && l.ns === NS && l.key === 'like-placeholder-3'), `uses namespace "${NS}", key like-<file name>`);
    ok(log.every(l => l.op === 'get'), 'just loading the page never adds a like');
    await card.scrollIntoViewIfNeeded(); await heart.click(); await d.waitForTimeout(500);
    ok(await n(heart) === '24' && await heart.getAttribute('aria-pressed') === 'true', 'like → 24, heart filled');
    await heart.click(); await heart.click(); await d.waitForTimeout(500);
    ok(await n(heart) === '24' && log.filter(l => l.op === 'hit').length === 1, 'clicking again does not like twice (one like per browser)');
    await card.locator('.tile').hover(); await d.waitForTimeout(700);
    const bb = await card.boundingBox(); await d.screenshot({ path: path.join(SHOTS, 'card-like.png'), clip: { x: bb.x - 24, y: bb.y - 24, width: bb.width + 48, height: bb.height + 48 } });
    await card.locator('.tile').click(); await d.waitForTimeout(140);
    ok((await V(d)).flyer, 'open: the thumbnail flies into the viewer (shared-element transition)');
    await d.waitForSelector('.lightbox.open'); await d.waitForTimeout(900);
    ok(!(await V(d)).flyer, '…and lands (flight element removed)');
    ok((await d.textContent('#lbIdx')).startsWith('3 /'), 'viewer opens on the clicked piece');
    const imgBox = await d.locator('.lb-slide[aria-hidden="false"] img').boundingBox(), panBox = await d.locator('#lbText').boundingBox();
    ok(imgBox.x + imgBox.width <= panBox.x && imgBox.height > 700, `desktop split: large image on the left (${Math.round(imgBox.height)}px tall), text on the right`);
    ok(parseFloat(await d.locator('#lbTitle').evaluate(e => getComputedStyle(e).fontSize)) >= 32, 'big title in the side panel');
    const t3 = (await V(d)).tint; ok(lum(t3) <= 0.15, `backdrop tinted and dark (${t3})`);
    ok(await n(d.locator('#lbLike')) === '24' && await d.getAttribute('#lbLike', 'aria-pressed') === 'true', 'viewer shows the same count + liked state');
    await d.keyboard.press('ArrowRight'); await d.waitForTimeout(90); const mid = await V(d);
    ok(mid.off < -20 && mid.off > -1000, `→ key slides the image sideways (mid-slide offset ${Math.round(mid.off)}px)`);
    await d.waitForTimeout(700);
    ok((await d.textContent('#lbIdx')).startsWith('4 /') && await n(d.locator('#lbLike')) === '6' && (await V(d)).off === 0, '…lands on the next piece with its own count');
    await d.locator('#lbLike').click(); await d.waitForTimeout(600);
    ok(await n(d.locator('#lbLike')) === '7', 'like from the viewer');
    await d.locator('#lbPrev').click(); await d.waitForTimeout(700); ok((await d.textContent('#lbIdx')).startsWith('3 /'), 'on-screen ‹ button slides back');
    await d.mouse.move(imgBox.x + imgBox.width / 2, imgBox.y + imgBox.height / 2); await d.mouse.click(imgBox.x + imgBox.width / 2, imgBox.y + imgBox.height / 2); await d.waitForTimeout(450);
    ok((await V(d)).scale > 2, 'desktop: click the artwork to zoom in');
    await d.keyboard.press('Escape'); await d.waitForTimeout(400); ok((await V(d)).scale === 1 && !(await V(d)).hidden, 'Esc first resets the zoom');
    const tabs = []; for (let k = 0; k < 6; k++) { await d.keyboard.press('Tab'); tabs.push(await d.evaluate(() => !!document.activeElement.closest('#lb'))); }
    ok(tabs.every(Boolean), 'focus stays trapped in the viewer');
    await d.keyboard.press('Escape'); await d.waitForTimeout(120); ok((await V(d)).flyer, 'close: artwork flies back to its thumbnail');
    await d.waitForTimeout(600); ok(await d.locator('#lb').isHidden(), 'Esc closes the viewer');
    await d.locator('.card').nth(3).locator('.like').scrollIntoViewIfNeeded();
    await d.locator('#gallery').scrollIntoViewIfNeeded(); await d.evaluate(() => document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' })); await d.waitForTimeout(900);
    await d.screenshot({ path: path.join(SHOTS, 'desktop-gallery.png') });
    await d.locator('.card').nth(0).locator('.tile').click(); await d.waitForTimeout(1300);
    const t1 = (await V(d)).tint, h1 = hue(t1);
    ok(lum(t1) <= 0.15 && h1 > 235 && h1 < 320, `tint follows the artwork: purple piece → dark purple (${t1}, hue ${Math.round(h1)}°)`);
    await d.screenshot({ path: path.join(SHOTS, 'desktop-viewer.png') });
    await d.locator('#lbNext').click(); await d.waitForTimeout(1300);
    ok((await V(d)).tint !== t1, 'tint changes with the piece');
    await d.screenshot({ path: path.join(SHOTS, 'lightbox.png') });
    await d.keyboard.press('Escape'); await d.waitForTimeout(800);
    ok(await n(d.locator('.card').nth(3).locator('.like')) === '7', 'card updated after liking in the lightbox');
    await d.reload({ waitUntil: 'networkidle' }); await d.waitForTimeout(1500);
    ok(await d.locator('.card').nth(2).locator('.like').getAttribute('aria-pressed') === 'true' && await n(d.locator('.card').nth(2).locator('.like')) === '24', 'like remembered after reload');
    const hitsBefore = log.filter(l => l.op === 'hit').length; await d.locator('.card').nth(2).locator('.like').click(); await d.waitForTimeout(400);
    ok(log.filter(l => l.op === 'hit').length === hitsBefore, '…and still can\u2019t like twice');

    console.log('Counter API down / rate-limited');
    mode = 'down'; const fc = await ctx({ viewport: { width: 1280, height: 800 } }); const f = await fc.newPage();
    await f.goto(BASE, { waitUntil: 'networkidle' }); await f.waitForTimeout(1200);
    ok(await f.locator('.tile').count() === g.artworks.length, 'gallery still works');
    ok(await n(f.locator('.card .like').first()) === null, 'count hidden when the API is down');
    await f.locator('.card .like').first().click(); await f.waitForTimeout(500);
    ok(await f.locator('.card .like').first().getAttribute('aria-pressed') === 'true', 'heart still works');
    ok((await f.evaluate(() => localStorage.getItem('yaz.pendingLikes'))).includes(key0.slice(5)), 'like kept to send later');
    mode = 'up'; const before1 = counters[key0];
    await f.reload({ waitUntil: 'networkidle' }); await f.waitForTimeout(1500);
    ok(counters[key0] === before1 + 1 && await n(f.locator('.card .like').first()) === String(before1 + 1), 'pending like sent once the API is back');
    ok(await f.evaluate(() => localStorage.getItem('yaz.pendingLikes')) === '[]', 'pending list cleared');
    mode = '429'; const rc = await ctx({ viewport: { width: 1280, height: 800 } }); const r4 = await rc.newPage();
    await r4.goto(BASE, { waitUntil: 'networkidle' }); await r4.waitForTimeout(1000);
    ok(await n(r4.locator('.card .like').first()) === null, 'count hidden when rate-limited (429)'); mode = 'up';

    console.log('Many artworks (request throttling)');
    const many = { artworks: Array.from({ length: 40 }, (_, i) => ({ image: `/images/artworks/placeholder-${i % 8 + 1}.svg?copy=${i}`, title: `Piece ${i + 1}` })) };
    const tc = await ctx({ viewport: { width: 1440, height: 9000 } });
    await tc.route('**/content/gallery.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(many) }));
    const t = await tc.newPage(); log.length = 0; const t0 = Date.now();
    await t.goto(BASE); await t.waitForTimeout(9000);
    const early = log.filter(l => l.t - t0 < 9500).length;
    ok(early >= 20 && early <= 24, `stays under the API limit (${early} requests in the first 10 s, limit 30 / 10 s)`);
    await t.waitForTimeout(9500);
    ok(await t.locator('.card .like .n:not([hidden])').count() === 40, 'all 40 counts loaded after the pause');

    console.log('Mobile');
    const mc = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const m = await mc.newPage(); watch(m);
    await m.goto(BASE, { waitUntil: 'networkidle' }); await m.waitForTimeout(2400);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-top.png') });
    await settle(m); await m.screenshot({ path: path.join(SHOTS, 'mobile-full.png'), fullPage: true });
    ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'no horizontal overflow');
    await m.click('#menuBtn'); await m.waitForTimeout(500); await m.screenshot({ path: path.join(SHOTS, 'mobile-menu.png') });
    await m.click('#menu a[data-nav="gallery"]'); await m.waitForTimeout(1200);
    await m.locator('.card .like').first().tap(); await m.waitForTimeout(600);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-gallery.png') });
    const cdp = await mc.newCDPSession(m);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
    const tap2 = async (x, y) => { for (let k = 0; k < 2; k++) { await touch('touchStart', [[x, y]]); await m.waitForTimeout(40); await touch('touchEnd', []); await m.waitForTimeout(110); } await m.waitForTimeout(450); };
    await m.locator('.tile').nth(0).scrollIntoViewIfNeeded(); await m.locator('.tile').nth(0).tap(); await m.waitForSelector('.lightbox.open'); await m.waitForTimeout(1300);
    const lk = await m.locator('#lbLike').boundingBox(); ok(lk && lk.y + lk.height <= 844, 'like button visible in the mobile viewer');
    const mi = await m.locator('.lb-slide[aria-hidden="false"] img').boundingBox(), mt = await m.locator('#lbTitle').boundingBox();
    ok(Math.abs(mi.x + mi.width / 2 - 195) < 2 && mt.y >= mi.y + mi.height && await m.locator('#lbCap').isVisible(), 'mobile: image centred, title + caption below it');
    const mtint = (await V(m)).tint; ok(lum(mtint) <= 0.15 && hue(mtint) > 235 && hue(mtint) < 320, `mobile backdrop tinted dark purple (${mtint})`);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-viewer.png') });
    await m.screenshot({ path: path.join(SHOTS, 'mobile-lightbox.png') });
    // one-finger swipe: the track follows the finger, the next piece peeks in, release snaps
    await touch('touchStart', [[320, 420]]); for (let x = 310; x >= 180; x -= 10) { await touch('touchMove', [[x, 422]]); await m.waitForTimeout(16); }
    const sw = await V(m); ok(Math.abs(sw.off - -140) <= 1, `swipe follows the finger 1:1 (finger moved 140px, image moved ${Math.round(-sw.off)}px)`);
    const peek = await m.locator('.lb-slide:not([aria-hidden="false"]):not([hidden])').evaluateAll(els => els.some(e => { const r = e.querySelector('img').getBoundingClientRect(); return r.left < innerWidth && r.right > 0; }));
    ok(peek, 'neighbouring artwork visible while dragging');
    await m.screenshot({ path: path.join(SHOTS, 'mobile-swipe.png') });
    for (let x = 170; x >= 120; x -= 25) { await touch('touchMove', [[x, 422]]); await m.waitForTimeout(16); } await touch('touchEnd', []); await m.waitForTimeout(700);
    ok((await V(m)).idx.startsWith('2 /') && (await V(m)).off === 0, 'release snaps to the next piece');
    await touch('touchStart', [[150, 420]]); for (let x = 160; x <= 220; x += 6) { await touch('touchMove', [[x, 420]]); await m.waitForTimeout(40); } await m.waitForTimeout(150); await touch('touchEnd', []); await m.waitForTimeout(600);
    ok((await V(m)).idx.startsWith('2 /') && (await V(m)).off === 0, 'short slow drag snaps back to the same piece');
    await touch('touchStart', [[120, 420]]); for (let x = 140; x <= 300; x += 40) { await touch('touchMove', [[x, 420]]); await m.waitForTimeout(16); } await touch('touchEnd', []); await m.waitForTimeout(700);
    ok((await V(m)).idx.startsWith('1 /'), 'quick flick to the right goes back to the previous piece');
    // pinch: zooms, never navigates — even with the fingers drifting sideways and lifting one at a time
    await touch('touchStart', [[160, 420]]); await touch('touchStart', [[160, 420], [230, 420]]);
    for (let k = 1; k <= 10; k++) { await touch('touchMove', [[160 - k * 12 - k * 8, 420], [230 + k * 12 - k * 8, 420 + k]]); await m.waitForTimeout(16); }
    await touch('touchEnd', [[40, 430]]); for (let x = 40; x >= -60 && x >= 5; x -= 15) { await touch('touchMove', [[x, 430]]); await m.waitForTimeout(16); } await touch('touchEnd', []); await m.waitForTimeout(600);
    const pz = await V(m); ok(pz.idx.startsWith('1 /') && pz.scale > 1.8, `pinch zooms the artwork (×${pz.scale.toFixed(2)}) and does not change piece`);
    await touch('touchStart', [[300, 420]]); for (let x = 280; x >= 60; x -= 20) { await touch('touchMove', [[x, 420]]); await m.waitForTimeout(16); } await touch('touchEnd', []); await m.waitForTimeout(600);
    const pn = await V(m); ok(pn.idx.startsWith('1 /') && pn.off === 0 && pn.scale > 1.8, 'one-finger drag while zoomed pans instead of swiping');
    await m.screenshot({ path: path.join(SHOTS, 'mobile-zoomed.png') });
    await tap2(195, 400); ok((await V(m)).scale === 1, 'double-tap zooms back out');
    await tap2(195, 400); const dz = await V(m); ok(dz.scale > 2 && dz.idx.startsWith('1 /'), `double-tap zooms in (×${dz.scale.toFixed(2)})`);
    ok(await m.evaluate(() => visualViewport.scale) === 1, 'page itself never pinch-zooms');
    await m.keyboard.press('ArrowRight'); await m.waitForTimeout(700); await m.keyboard.press('ArrowLeft'); await m.waitForTimeout(700);
    ok((await V(m)).scale === 1, 'zoom resets when the piece changes');
    await m.locator('#lbClose').tap(); await m.waitForTimeout(800); ok(await m.locator('#lb').isHidden(), 'close button closes the viewer');
    await m.locator('#connect').scrollIntoViewIfNeeded(); await m.waitForTimeout(900);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-connect.png') });

    console.log('Reduced motion');
    const r = await (await ctx({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })).newPage(); watch(r); await r.goto(BASE, { waitUntil: 'networkidle' }); await r.waitForTimeout(300);
    ok(await r.evaluate(() => getComputedStyle(document.querySelector('.card')).opacity) === '1', 'content visible immediately with reduced motion');
    await r.locator('.tile').first().click(); await r.waitForTimeout(60); const rv = await V(r);
    ok(!rv.flyer && await r.locator('.lightbox.open').count() === 1, 'reduced motion: viewer opens instantly, no flight');
    await r.keyboard.press('ArrowRight'); await r.waitForTimeout(40); ok((await V(r)).idx.startsWith('2 /') && (await V(r)).off === 0, 'reduced motion: arrows switch instantly');
    await r.keyboard.press('Escape'); await r.waitForTimeout(60); ok(await r.locator('#lb').isHidden(), 'reduced motion: closes instantly');

    ok(errs.length === 0, 'no console / page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log('\nAll checks passed ✅  Screenshots in screenshots/');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
