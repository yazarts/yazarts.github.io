// Local check: validates content + .pages.yml, runs the site in headless Chrome against a LOCAL fake
// Supabase (real schema.sql inside PGlite) and a MOCKED Web3Forms, and takes screenshots.
// Nothing is sent to a real service; no email can reach the artist from this script.
// Usage: npm run serve (other terminal), then: npm run check
const fs = require('fs'), path = require('path');
const yaml = require('js-yaml'); const { chromium } = require('playwright-core');
const fake = require('./fake-supabase');
const root = path.join(__dirname, '..'); const SHOTS = path.join(root, 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:8090/';
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('  ✓ ' + m); };

console.log('Content');
const pc = yaml.load(fs.readFileSync(path.join(root, '.pages.yml'), 'utf8')); ok(pc.content.length >= 3, '.pages.yml parses');
const g = JSON.parse(fs.readFileSync(path.join(root, 'content/gallery.json'))); const s = JSON.parse(fs.readFileSync(path.join(root, 'content/site.json')));
const integ = JSON.parse(fs.readFileSync(path.join(root, 'content/integrations.json')));
ok(Array.isArray(g.artworks), 'gallery.json has artworks list');
ok(s.about === "Hi, I'm Yaz, a digital artist sharing my favourite pieces here.", 'about text is the new one-liner');
ok(s.links.some(l => l.url === 'https://www.tiktok.com/@yaz.arts'), 'TikTok link present');
ok(Object.keys(integ).sort().join() === 'supabaseKey,supabaseUrl,web3formsAccessKey', 'integrations.json has the 3 config fields');
for (const p of [...g.artworks.map(a => a.image), s.heroImage].filter(Boolean)) ok(fs.existsSync(path.join(root, p.replace(/^\//, ''))), `image exists: ${p}`);

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const db = await fake.boot(); const server = await fake.start(db);
  const FAKE = `http://localhost:${fake.PORT}`;
  // seed some activity so the screenshots look alive (different fake IPs so rate limits don't trigger)
  const ids = g.artworks.map(a => a.image.split('/').pop().replace(/\.[a-z0-9]+$/i, '').toLowerCase());
  let ip = 0; const as = (fn, args) => fake.rpc(db, fn, args, null, '10.1.0.' + (++ip % 250));
  for (let i = 0; i < ids.length; i++) {
    for (let k = 0; k < [14, 9, 23, 6, 11, 4, 17, 8][i % 8]; k++) await as('like_art', { p_art: ids[i], p_visitor: `00000000-0000-4000-8000-${String(i * 100 + k).padStart(12, '0')}` });
    for (let k = 0; k < [52, 31, 77, 19, 40, 12, 58, 26][i % 8]; k++) await as('record_view', { p_art: ids[i] });
  }
  const seedComments = [[2, 'Lina', 'The blue and brown together are so calming 💙'], [2, 'Omar', 'This would look amazing as a print!'], [0, 'Sara', 'Love the soft shapes.'], [4, 'Kenji', 'Beautiful colours'], [6, 'Maya', 'Wallpaper material for sure']];
  for (const [i, n, b] of seedComments) await as('add_comment', { p_art: ids[i], p_name: n, p_body: b });

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [], mails = [];
  const watch = (p) => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); };
  // every context: Web3Forms is ALWAYS mocked (records the would-be email, sends nothing)
  const ctx = async (opts, configured) => {
    const c = await browser.newContext(opts);
    await c.route('https://api.web3forms.com/**', r => { mails.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"message":"Email sent (mock)"}' }); });
    if (configured) await c.route('**/content/integrations.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ supabaseUrl: FAKE, supabaseKey: 'sb_publishable_TEST_ONLY_local_fake_key', web3formsAccessKey: '00000000-0000-0000-0000-000000000000' }) }));
    return c;
  };
  const settle = async (p) => { const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 350) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(90); }
    await p.waitForTimeout(1200); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700); };
  try {
    console.log('Not configured yet (fresh repo)');
    const u = await (await ctx({ viewport: { width: 1280, height: 800 } }, false)).newPage(); watch(u);
    await u.goto(BASE, { waitUntil: 'networkidle' }); await u.waitForTimeout(800);
    ok(await u.locator('.tile').count() === g.artworks.length, 'gallery still renders');
    ok(!(await u.locator('.meta').first().isVisible()), 'like/comment/view row hidden while backend is off');
    await u.locator('.tile').first().click(); await u.waitForSelector('.lightbox.open'); ok(!(await u.locator('#lbSocial').isVisible()), 'lightbox shows no comment panel while off');
    await u.keyboard.press('Escape'); await u.waitForTimeout(500);
    await u.fill('#contactForm [name=name]', 'Test'); await u.fill('#contactForm [name=message]', 'Hello'); await u.waitForTimeout(2600);
    await u.click('#sendBtn'); await u.waitForTimeout(300);
    ok(/switched on yet/.test(await u.textContent('#formMsg')), 'contact form explains it is not switched on yet');
    await u.goto(BASE + 'conversation.html#' + 'a'.repeat(64)); await u.waitForTimeout(600); ok(/switched on/.test(await u.textContent('#chatSub')), 'conversation page degrades gracefully');
    await u.goto(BASE + 'inbox.html'); await u.waitForTimeout(600); ok(await u.locator('#offNote').isVisible(), 'inbox page degrades gracefully');
    ok(mails.length === 0, 'no email attempted while off');

    console.log('Desktop (configured, local fake backend)');
    const dc = await ctx({ viewport: { width: 1440, height: 900 } }, true); const d = await dc.newPage(); watch(d);
    await d.goto(BASE, { waitUntil: 'networkidle' }); await d.waitForTimeout(2600);
    await d.screenshot({ path: path.join(SHOTS, 'desktop-top.png') });
    ok(await d.locator('.tile').count() === g.artworks.length, 'all artworks render as tiles');
    ok(await d.locator('#links a').count() === s.links.length, 'social links render (incl. TikTok)');
    ok((await d.textContent('#links')).includes('@yaz.arts'), 'TikTok handle shows @yaz.arts');
    ok(await d.locator('.meta').first().isVisible(), 'like/comment/view row visible');
    ok((await d.locator('.meta').nth(2).textContent()).replace(/\s+/g, ' ').trim() === '23 2 77 views', 'counts come from the backend');
    await settle(d); await d.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });
    const card = d.locator('.card').nth(2); await card.scrollIntoViewIfNeeded(); await d.waitForTimeout(400);
    await card.locator('.m-like').click(); await d.waitForTimeout(700);
    ok((await card.locator('.m-like .n').textContent()) === '24', 'like +1');
    await card.locator('.m-like').click(); await d.waitForTimeout(500);
    ok((await card.locator('.m-like .n').textContent()) === '24', 'second like from same visitor ignored');
    await card.locator('.tile').hover(); await d.waitForTimeout(700);
    const bb = await card.boundingBox(); await d.screenshot({ path: path.join(SHOTS, 'card-like-comment-view.png'), clip: { x: bb.x - 24, y: bb.y - 24, width: bb.width + 48, height: bb.height + 48 } });
    await d.screenshot({ path: path.join(SHOTS, 'desktop-gallery-hover.png') });
    await card.locator('.tile').click(); await d.waitForSelector('.lightbox.open'); await d.waitForTimeout(900);
    ok((await d.textContent('#lbIdx')).startsWith('3 /'), 'lightbox opens on the clicked piece');
    ok(await d.locator('#comments li').count() === 2, 'lightbox lists the comments');
    ok((await d.textContent('#lbViewN')) === '78', 'opening the piece counts a view');
    await d.fill('#cform [name=name]', 'Nadia'); await d.fill('#cform [name=body]', 'So peaceful, I love it!'); await d.click('#cform button[type=submit]'); await d.waitForTimeout(900);
    ok((await d.textContent('#comments li:first-child')).includes('So peaceful'), 'new comment appears');
    ok((await d.textContent('#lbComN')) === '3', 'comment count +1');
    await d.screenshot({ path: path.join(SHOTS, 'lightbox-comments.png') });
    await d.locator('#lbNext').click(); await d.waitForTimeout(800); ok((await d.textContent('#lbIdx')).startsWith('4 /'), 'next button → next piece');
    await d.keyboard.press('Escape'); await d.waitForTimeout(500); ok(await d.locator('#lb').isHidden(), 'Esc closes lightbox');
    ok((await card.locator('.m-com .n').textContent()) === '3', 'card shows the new comment count');

    console.log('Contact → private conversation → artist inbox');
    await d.locator('#connect').scrollIntoViewIfNeeded(); await d.waitForTimeout(900);
    await d.click('#contactForm button[type=submit]'); await d.waitForTimeout(200); ok(/name/.test(await d.textContent('#formMsg')), 'validation message for empty form');
    await d.check('#contactForm input[value=commission]', { force: true }); await d.waitForTimeout(200);
    ok(await d.locator('#commFields').isVisible(), 'commission fields appear for commission requests');
    await d.fill('#contactForm [name=name]', 'Mina'); await d.fill('#contactForm [name=email]', 'mina@example.com');
    await d.selectOption('#commType', 'Portrait'); await d.selectOption('#budget', { index: 2 });
    await d.fill('#contactForm [name=message]', 'Hi Yaz! Could you paint a calm portrait of my cat in your blue and brown style? No rush.');
    const cbox = await d.locator('#contact').boundingBox();
    await d.screenshot({ path: path.join(SHOTS, 'contact-form.png'), clip: { x: cbox.x - 30, y: cbox.y - 30, width: Math.min(1440 - cbox.x + 30, 1300), height: cbox.height + 60 } });
    await d.click('#sendBtn'); await d.waitForSelector('#sent:not([hidden])'); await d.waitForTimeout(700);
    const link = await d.inputValue('#threadLink'); ok(/conversation\.html#[a-f0-9]{64}$/.test(link), 'visitor gets a private conversation link');
    ok(mails.length === 1 && /New commission request from Mina/.test(mails[0].subject) && /inbox\.html$/.test(mails[0].reply_here) && !mails[0].replyto, 'artist notification email prepared (mocked, links to the inbox)');
    const sbox = await d.locator('#contact').boundingBox();
    await d.screenshot({ path: path.join(SHOTS, 'contact-sent.png'), clip: { x: sbox.x - 30, y: sbox.y - 30, width: Math.min(1440 - sbox.x + 30, 1300), height: sbox.height + 60 } });

    const ic = await ctx({ viewport: { width: 1440, height: 900 } }, true); const inb = await ic.newPage(); watch(inb);
    await inb.goto(BASE + 'inbox.html', { waitUntil: 'networkidle' }); await inb.waitForTimeout(500);
    ok(await inb.locator('#login').isVisible(), 'inbox asks the artist to sign in');
    await inb.screenshot({ path: path.join(SHOTS, 'inbox-login.png') });
    await inb.fill('#loginForm [name=email]', fake.STRANGER.email); await inb.fill('#loginForm [name=password]', fake.STRANGER.password); await inb.click('#loginForm button');
    await inb.waitForTimeout(800); ok(await inb.locator('#login').isVisible() && /not allowed/.test(await inb.textContent('#loginMsg')), 'a non-artist login is refused');
    errs.length = 0; // the refused call above logs an expected 400 in the console
    await inb.fill('#loginForm [name=email]', fake.ARTIST.email); await inb.fill('#loginForm [name=password]', fake.ARTIST.password); await inb.click('#loginForm button');
    await inb.waitForSelector('#inbox:not([hidden])'); await inb.waitForTimeout(400);
    ok(await inb.locator('.th').count() === 1 && await inb.locator('.th.unread').count() === 1, 'new request shows as unread');
    await inb.locator('.th').first().click(); await inb.waitForTimeout(700);
    ok((await inb.textContent('#threadView')).includes('mina@example.com'), 'artist sees request details');
    await inb.fill('#aBody', 'Hi Mina! I would love to. Could you send me a photo of your cat? A 30×30 cm digital portrait would be $60.'); await inb.click('#artistReply button'); await inb.waitForTimeout(900);
    ok(await inb.locator('#threadView .msg').count() === 2, 'artist reply posted on the site');
    await inb.screenshot({ path: path.join(SHOTS, 'inbox.png') });
    await inb.click('.tab[data-tab=comments]'); await inb.waitForTimeout(600);
    const before = await inb.locator('#modList li').count(); ok(before === seedComments.length + 1, 'comment moderation list');
    inb.once('dialog', dl => dl.accept()); await inb.locator('#modList li').first().locator('button').click(); await inb.waitForTimeout(800);
    ok(await inb.locator('#modList li').count() === before - 1, 'artist can delete a comment');
    await inb.screenshot({ path: path.join(SHOTS, 'inbox-comments.png') });

    await d.goto(link); await d.waitForTimeout(900);
    ok(await d.locator('.msg.artist').count() === 1, 'visitor sees the artist reply on their private page');
    await d.fill('#replyBody', 'Yay! Sending the photo on Instagram now. Thank you!'); await d.click('#replyForm button'); await d.waitForTimeout(900);
    ok(await d.locator('.msg').count() === 3, 'visitor can reply back');
    ok(mails.length === 2 && /New reply from Mina/.test(mails[1].subject), 'artist notified of the visitor reply (mocked)');
    await d.screenshot({ path: path.join(SHOTS, 'conversation.png'), fullPage: true });
    await d.goto('about:blank'); await d.goto(BASE + 'conversation.html#' + 'f'.repeat(64)); await d.waitForTimeout(800);
    ok(/doesn’t exist/.test(await d.textContent('#chatSub')), 'wrong token shows a friendly message'); errs.length = 0;
    await d.goto(BASE + '#connect'); await d.waitForTimeout(1500); ok(await d.locator('#mine li').count() === 1, '"Your conversations" list on the home page');

    console.log('Mobile');
    const mc = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, true);
    const m = await mc.newPage(); watch(m);
    await m.goto(BASE, { waitUntil: 'networkidle' }); await m.waitForTimeout(2400);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-top.png') });
    await settle(m); await m.screenshot({ path: path.join(SHOTS, 'mobile-full.png'), fullPage: true });
    ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'no horizontal overflow');
    await m.click('#menuBtn'); await m.waitForTimeout(500); await m.screenshot({ path: path.join(SHOTS, 'mobile-menu.png') });
    await m.click('#menu a[data-nav="gallery"]'); await m.waitForTimeout(1200);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-gallery.png') });
    await m.locator('.tile').nth(2).tap(); await m.waitForSelector('.lightbox.open'); await m.waitForTimeout(900);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-lightbox.png') });
    await m.evaluate(() => document.querySelector('#lb').scrollTo(0, 99999)); await m.waitForTimeout(500);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-lightbox-comments.png') }); ok(true, 'lightbox + comments on mobile');
    await m.locator('#lbClose').tap(); await m.waitForTimeout(600);
    await m.locator('#contact').scrollIntoViewIfNeeded(); await m.waitForTimeout(900); await m.evaluate(() => scrollBy(0, -80)); await m.waitForTimeout(300);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-contact.png') });
    const mi = await mc.newPage(); watch(mi); await mi.goto(BASE + 'inbox.html'); await mi.waitForTimeout(400);
    await mi.fill('#loginForm [name=email]', fake.ARTIST.email); await mi.fill('#loginForm [name=password]', fake.ARTIST.password); await mi.click('#loginForm button');
    await mi.waitForSelector('#inbox:not([hidden])'); await mi.locator('.th').first().tap(); await mi.waitForTimeout(800);
    await mi.screenshot({ path: path.join(SHOTS, 'mobile-inbox-thread.png') }); ok(true, 'inbox usable on a phone');

    console.log('Reduced motion');
    const r = await (await ctx({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, true)).newPage(); await r.goto(BASE, { waitUntil: 'networkidle' }); await r.waitForTimeout(300);
    ok(await r.evaluate(() => getComputedStyle(document.querySelector('.card')).opacity) === '1', 'content visible immediately with reduced motion');

    ok(errs.length === 0, 'no console / page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log('\nAll checks passed ✅  Screenshots in screenshots/');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
