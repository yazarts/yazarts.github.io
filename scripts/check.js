// Local check: validates content files + .pages.yml, then screenshots the site with headless Chrome.
// Usage: npm run serve (in another terminal), then: npm run check     (BASE_URL / CHROME_PATH env vars optional)
const fs = require('fs'), path = require('path');
const yaml = require('js-yaml'); const { chromium } = require('playwright-core');
const root = path.join(__dirname, '..'); const SHOTS = path.join(root, 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:8090/';
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('  ✓ ' + m); };

console.log('Content');
yaml.load(fs.readFileSync(path.join(root, '.pages.yml'), 'utf8')); ok(true, '.pages.yml parses');
const g = JSON.parse(fs.readFileSync(path.join(root, 'content/gallery.json'))); const s = JSON.parse(fs.readFileSync(path.join(root, 'content/site.json')));
ok(Array.isArray(g.artworks), 'gallery.json has artworks list');
for (const p of [...g.artworks.map(a => a.image), s.heroImage].filter(Boolean)) ok(fs.existsSync(path.join(root, p.replace(/^\//, ''))), `image exists: ${p}`);

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; const watch = (p) => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); };
  const settle = async (p) => { const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 350) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(90); }
    await p.waitForTimeout(1200); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700); };
  try {
    console.log('Desktop');
    const d = await browser.newPage({ viewport: { width: 1440, height: 900 } }); watch(d);
    await d.goto(BASE, { waitUntil: 'networkidle' }); await d.waitForTimeout(2600);
    await d.screenshot({ path: path.join(SHOTS, 'desktop-top.png') });
    ok(await d.locator('.tile').count() === g.artworks.length, 'all artworks render as tiles');
    ok(await d.locator('#links a').count() === s.links.length, 'social links render');
    await settle(d); await d.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });
    await d.locator('.tile[data-i="2"]').scrollIntoViewIfNeeded(); await d.waitForTimeout(600);
    await d.locator('.tile[data-i="2"]').hover(); await d.waitForTimeout(700);
    await d.screenshot({ path: path.join(SHOTS, 'desktop-gallery-hover.png') });
    await d.locator('.tile[data-i="2"]').click(); await d.waitForSelector('.lightbox.open'); await d.waitForTimeout(800);
    await d.screenshot({ path: path.join(SHOTS, 'lightbox.png') });
    ok((await d.textContent('#lbIdx')).startsWith('3 /'), 'lightbox opens on the clicked piece');
    await d.keyboard.press('ArrowRight'); await d.waitForTimeout(500); ok((await d.textContent('#lbIdx')).startsWith('4 /'), 'arrow key → next piece');
    await d.keyboard.press('Escape'); await d.waitForTimeout(500); ok(await d.locator('#lb').isHidden(), 'Esc closes lightbox');

    console.log('Mobile');
    const mc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const m = await mc.newPage(); watch(m);
    await m.goto(BASE, { waitUntil: 'networkidle' }); await m.waitForTimeout(2400);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-top.png') });
    await settle(m); await m.screenshot({ path: path.join(SHOTS, 'mobile-full.png'), fullPage: true });
    ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'no horizontal overflow');
    await m.click('#menuBtn'); await m.waitForTimeout(500); await m.screenshot({ path: path.join(SHOTS, 'mobile-menu.png') });
    await m.click('#menu a[data-nav="gallery"]'); await m.waitForTimeout(1200);
    await m.locator('.tile').first().tap(); await m.waitForSelector('.lightbox.open'); await m.waitForTimeout(800);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-lightbox.png') }); ok(true, 'lightbox opens on tap');

    console.log('Reduced motion');
    const rc = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const r = await rc.newPage(); await r.goto(BASE, { waitUntil: 'networkidle' }); await r.waitForTimeout(200);
    ok(await r.evaluate(() => getComputedStyle(document.querySelector('.tile')).opacity) === '1', 'content visible immediately with reduced motion');

    ok(errs.length === 0, 'no console / page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log('\nAll checks passed ✅  Screenshots in screenshots/');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
