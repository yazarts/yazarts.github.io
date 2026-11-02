// Local check for the TEST site built by scripts/make_test_site.sh (served on :8091). The Abacus counter API is mocked,
// so real likes/views are never touched. Usage: bash scripts/make_test_site.sh && (cd /tmp/yaz-test-site && python3 -m http.server 8091 &) && node scripts/check.js
const { chromium } = require('playwright-core');
const SH = require('path').join(__dirname, '..', 'screenshots') + '/'; require('fs').mkdirSync(SH, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8091/';
const ok = (c, m) => console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const counters = {}; const log = [];
  const mock = async (c) => c.route('https://abacus.jasoncameron.dev/**', r => {
    const [, op, ns, key] = new URL(r.request().url()).pathname.split('/'); log.push(op + ' ' + key);
    const h = { 'access-control-allow-origin': '*' };
    if (op === 'hit') { counters[key] = (counters[key] || 0) + 1; return r.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify({ value: counters[key] }) }); }
    if (op === 'info') return r.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify(key in counters ? { exists: true, value: counters[key] } : { exists: false, value: -1 }) });
    r.fulfill({ status: 404, headers: h, body: '{}' });
  });
  counters['like-img1593'] = 12; counters['view-img1593'] = 87; counters['like-img1452'] = 5; counters['view-img1452'] = 40;
  const errs = []; const watch = (p) => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); };
  const tag = async (p, text) => p.evaluate(t => { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#c33;color:#fff;font:12px sans-serif;padding:3px 8px;border-radius:4px;pointer-events:none'; d.className = 'testtag'; document.body.appendChild(d); }, text);
  const untag = (p) => p.evaluate(() => document.querySelectorAll('.testtag').forEach(e => e.remove()));

  // ---------- desktop ----------
  const dc = await b.newContext({ viewport: { width: 1440, height: 900 } }); await mock(dc);
  const d = await dc.newPage(); watch(d);
  await d.goto(BASE, { waitUntil: 'networkidle' }); await d.waitForTimeout(1500);
  const bgState = await d.evaluate(() => ({ paused: document.querySelector('#bgAudio').paused, btn: !document.querySelector('#musicBtn').hidden }));
  ok(bgState.btn, 'music icon visible when a background track is set'); console.log('    bg autoplay before any gesture: paused =', bgState.paused);
  const bb = await d.locator('.brand').boundingBox(), mb = await d.locator('#musicBtn').boundingBox();
  ok(mb.x > bb.x + bb.width && mb.x - (bb.x + bb.width) < 30 && Math.abs((mb.y + mb.height / 2) - (bb.y + bb.height / 2)) < 6, `music icon right next to the logo (gap ${Math.round(mb.x - bb.x - bb.width)}px)`);
  ok(await d.locator('#musicBtn').evaluate(e => getComputedStyle(e).color) === 'rgb(156, 195, 230)', 'music icon is soft blue');
  // first click anywhere starts it if autoplay was blocked
  await d.mouse.click(700, 300); await d.waitForTimeout(1200);
  ok(!(await d.evaluate(() => document.querySelector('#bgAudio').paused)), 'background music playing (after autoplay or first click)');
  ok(await d.locator('#musicBtn.playing').count() === 1, 'equalizer animates while playing');
  console.log('    bg volume', await d.evaluate(() => document.querySelector('#bgAudio').volume.toFixed(2)));
  await tag(d, 'TEST DATA (local)'); await d.screenshot({ path: SH + 'music-icon.png', clip: { x: 0, y: 0, width: 520, height: 70 } });
  await d.locator('#musicBtn').click(); await d.waitForTimeout(700);
  ok(await d.evaluate(() => document.querySelector('#bgAudio').paused) && await d.evaluate(() => localStorage.getItem('yaz.sound')) === 'false', 'icon toggles mute, remembered in localStorage');
  await d.screenshot({ path: SH + 'music-icon-muted.png', clip: { x: 0, y: 0, width: 520, height: 70 } });
  await d.locator('#musicBtn').click(); await d.waitForTimeout(600);
  ok(!(await d.evaluate(() => document.querySelector('#bgAudio').paused)), 'icon turns it back on');
  // gallery 2 rows
  await d.evaluate(() => document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' })); await d.waitForTimeout(1200);
  const g = await d.evaluate(() => { const cols = getComputedStyle(document.querySelector('#grid')).gridTemplateColumns.split(' ').length; return { cols, vis: [...document.querySelectorAll('#grid .card')].filter(c => c.offsetParent).length, total: document.querySelectorAll('#grid .card').length, more: document.querySelector('#grid .tile.more')?.textContent.trim() }; });
  ok(g.vis === g.cols * 2 && g.more, `gallery shows 2 rows (${g.cols} cols, ${g.vis}/${g.total} visible), last slot = "${g.more}"`);
  await d.waitForTimeout(300); await d.screenshot({ path: SH + 'gallery-viewmore.png' });
  await d.locator('#grid .tile.more').click(); await d.waitForTimeout(250);
  await d.screenshot({ path: SH + 'gallery-expanding.png' }); await d.waitForTimeout(1200);
  const g2 = await d.evaluate(() => [...document.querySelectorAll('#grid .card')].filter(c => c.offsetParent).length);
  ok(g2 === g.total && await d.locator('#lessBtn').isVisible(), `expanded to all ${g2} with "Show less"`);
  await d.locator('#lessBtn').scrollIntoViewIfNeeded(); await d.screenshot({ path: SH + 'gallery-expanded.png' });
  await d.locator('#lessBtn').click(); await d.waitForTimeout(1200);
  ok(await d.evaluate(() => [...document.querySelectorAll('#grid .card')].filter(c => c.offsetParent).length) === g.vis, 'Show less collapses back to 2 rows');
  // counts
  const c0 = d.locator('#grid .card').first();
  ok(await c0.locator('.like .n').textContent() === '12' && await c0.locator('.views .n').textContent() === '87', 'grid card shows likes 12 + views 87 (eye icon)');
  ok(!log.some(l => l.startsWith('get ')), 'counts read with /info (no 404s for new pieces)');
  await untag(d);
  const cb = await c0.boundingBox(); await d.screenshot({ path: SH + 'card-counts.png', clip: { x: cb.x - 16, y: cb.y - 16, width: cb.width + 32, height: cb.height + 32 } });
  // viewer full-res
  await c0.locator('.tile').click(); await d.waitForTimeout(1600);
  const vi = await d.evaluate(() => { const im = document.querySelector('.lb-slide[aria-hidden="false"] img'); return { src: im.currentSrc, nw: im.naturalWidth, nh: im.naturalHeight, views: document.querySelector('#lbViews .n').textContent, likes: document.querySelector('#lbLike .n').textContent }; });
  ok(/images\/artworks\/img1593\.jpeg$/.test(vi.src) && vi.nw === 3092, `viewer loads the original ${vi.src.split('/').pop()} at ${vi.nw}×${vi.nh}`);
  ok(vi.views === '88' && vi.likes === '12', `viewer shows likes ${vi.likes} + views ${vi.views} (view counted on open)`);
  const thumbSrc = await c0.locator('img').evaluate(e => e.currentSrc); console.log('    grid tile uses', thumbSrc.replace(BASE, ''));
  await d.screenshot({ path: SH + 'viewer-desktop.png' });
  for (let i = 0; i < 5; i++) { await d.keyboard.press('+'); await d.waitForTimeout(350); }
  await d.waitForTimeout(800);
  const z = await d.evaluate(() => { const im = document.querySelector('.lb-slide[aria-hidden="false"] img'); const r = im.getBoundingClientRect(); return { hi: im.classList.contains('hi'), w: r.width, cw: im.clientWidth, x: r.left, y: r.top }; });
  ok(z.hi && Math.abs(z.cw - z.w) < 1, `zoomed: image laid out at real zoomed size ${Math.round(z.w)}px (≥ ${3092}px source → full detail)`);
  await d.screenshot({ path: SH + 'viewer-zoom-fullres.png', clip: { x: 300, y: 250, width: 400, height: 400 } });
  await d.keyboard.press('Escape'); await d.waitForTimeout(400); await d.keyboard.press('Escape'); await d.waitForTimeout(900);
  await d.reload({ waitUntil: 'networkidle' }); await d.waitForTimeout(800);
  await d.locator('#grid .card').first().locator('.tile').click(); await d.waitForTimeout(1200);
  ok(counters['view-img1593'] === 88, 'second open in the same session does not add another view');
  await d.keyboard.press('Escape'); await d.waitForTimeout(900);
  // albums
  await d.evaluate(() => document.querySelector('#albums').scrollIntoView({ behavior: 'instant' })); await d.waitForTimeout(1300);
  const sq = await d.locator('.album-tile').first().boundingBox();
  ok(Math.abs(sq.width - sq.height) < 1.5, `album covers are square (${Math.round(sq.width)}×${Math.round(sq.height)})`);
  ok(await d.locator('#menu a[data-nav="albums"]').count() === 1, 'Albums in the nav');
  const order = await d.evaluate(() => [...document.querySelectorAll('main > section')].map(s => s.id).join(','));
  ok(order === 'home,gallery,albums,about,connect', 'Albums section right under Gallery: ' + order);
  await tag(d, 'TEST ALBUMS (local test data, not published)'); await d.screenshot({ path: SH + 'albums-desktop.png' }); await untag(d);
  await d.locator('.album-tile').first().click(); await d.waitForTimeout(150);
  ok(await d.locator('#av .lb-flyer').count() === 1, 'album opens with the shared-element flight');
  await d.waitForTimeout(1200);
  const avs = await d.evaluate(() => ({ tint: getComputedStyle(document.querySelector('#avTint')).backgroundColor, al: !document.querySelector('#albumAudio').paused, alsrc: document.querySelector('#albumAudio').currentSrc, bg: document.querySelector('#bgAudio').paused, head: document.querySelector('.av-head').getBoundingClientRect().toJSON(), n: document.querySelectorAll('#avGrid .card').length, tileAR: (() => { const r = document.querySelector('#avGrid .tile').getBoundingClientRect(); return r.width / r.height; })() }));
  ok(avs.al && /test-album\.mp3$/.test(avs.alsrc), 'album music is playing: ' + avs.alsrc.split('/').pop());
  ok(avs.bg, 'background music paused while the album plays');
  ok(Math.abs(avs.tileAR - 0.75) < 0.01 && avs.n === 5, `album artworks in 3:4 grid (${avs.n} pieces)`);
  ok(avs.head.top < 60 && avs.head.left < 200, 'small cover icon + album name at the top left');
  console.log('    album backdrop tint', avs.tint);
  await tag(d, 'TEST ALBUM (local test data)'); await d.screenshot({ path: SH + 'album-open.png' }); await untag(d);
  await d.locator('#avGrid .tile').nth(1).click(); await d.waitForTimeout(1600);
  const vt = await d.evaluate(() => ({ tint: getComputedStyle(document.querySelector('#lbTint')).backgroundColor, data: document.querySelector('#lb').dataset.tint, av: document.querySelector('#av').dataset.tint }));
  ok(vt.data === vt.av && vt.data, `viewer tint in album = cover colour (${vt.data}) for an artwork that isn't the cover`);
  await tag(d, 'TEST ALBUM (local test data)'); await d.screenshot({ path: SH + 'album-viewer.png' }); await untag(d);
  await d.keyboard.press('ArrowRight'); await d.waitForTimeout(900);
  ok(await d.evaluate(() => document.querySelector('#lb').dataset.tint) === vt.data, 'tint stays the cover colour while swiping');
  await d.keyboard.press('Escape'); await d.waitForTimeout(900);
  ok(await d.locator('#lb').isHidden() && await d.locator('#av').isVisible(), 'closing the viewer returns to the album');
  await d.keyboard.press('Escape'); await d.waitForTimeout(1300);
  const after = await d.evaluate(() => ({ al: document.querySelector('#albumAudio').paused, bg: document.querySelector('#bgAudio').paused, av: document.querySelector('#av').hidden, ov: document.body.style.overflow }));
  ok(after.al && !after.bg && after.av && after.ov === '', 'closing the album stops its music and resumes the background music');

  // ---------- mobile ----------
  const mc = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await mock(mc);
  const m = await mc.newPage(); watch(m);
  await m.goto(BASE, { waitUntil: 'networkidle' }); await m.waitForTimeout(1500);
  await tag(m, 'TEST DATA (local)'); await m.screenshot({ path: SH + 'mobile-top-music.png' });
  const mm = await m.evaluate(() => { const cols = getComputedStyle(document.querySelector('#grid')).gridTemplateColumns.split(' ').length; return { cols, vis: [...document.querySelectorAll('#grid .card')].filter(c => c.offsetParent).length }; });
  ok(mm.cols === 2 && mm.vis === 4, `mobile: 2 columns × 2 rows (${mm.vis} visible incl. View more)`);
  await m.evaluate(() => document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' })); await m.waitForTimeout(1200);
  await m.screenshot({ path: SH + 'mobile-gallery-viewmore.png' });
  await m.evaluate(() => document.querySelector('#albums').scrollIntoView({ behavior: 'instant' })); await m.waitForTimeout(1200);
  await m.screenshot({ path: SH + 'mobile-albums.png' });
  await m.locator('.album-tile').first().tap(); await m.waitForTimeout(1500);
  ok(!(await m.evaluate(() => document.querySelector('#albumAudio').paused)), 'mobile: album music plays on tap');
  await m.screenshot({ path: SH + 'mobile-album-open.png' });
  await m.locator('#avGrid .tile').first().tap(); await m.waitForTimeout(1600);
  await m.screenshot({ path: SH + 'mobile-album-viewer.png' });
  const mt = await m.evaluate(() => { const im = document.querySelector('.lb-slide[aria-hidden="false"] img').getBoundingClientRect(), t = document.querySelector('#lbText').getBoundingClientRect(); return im.bottom <= t.top + 2; });
  ok(mt, 'mobile: title + caption below the image');
  await untag(m);
  console.log(errs.length ? '  console errors: ' + errs.join(' | ') : '  ✓ no console errors');
  await b.close();
})();
