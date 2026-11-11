(() => {
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // CMS stores paths like "/images/x.jpg"; make them relative so the site works at the domain root.
  const relPath = (p) => !p ? '' : /^(https?:)?\/\//.test(p) ? p : String(p).replace(/^\/+/, '');
  const asset = (p) => relPath(p);
  const json = (u) => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  };
  let art = [], tiers = [], thumbs = {}, sizes = {};
  // grid previews + image sizes are generated at deploy time (content/thumbs.json); the viewer always loads the untouched original
  const clean = (p) => relPath(p).split(/[?#]/)[0];
  const thumb = (p) => { const t = thumbs[clean(p)]; return asset(t || p); };
  const sizeOf = (p) => sizes[clean(p)] || null;          // [w, h] or null
  // A tier's photos: the CMS list (first = front of the stack), plus a legacy single `image` if it isn't already there.
  // Same file twice (old field + new list, or a repeated upload) is kept once, so a one-photo tier stays one photo.
  function tierImages(t) {
    if (!t || typeof t !== 'object') return [];
    const raw = [];
    for (const key of ['photos', 'images']) {
      const v = t[key];
      if (Array.isArray(v)) raw.push(...v);
      else if (typeof v === 'string') raw.push(v);
    }
    if (typeof t.image === 'string') raw.push(t.image);
    const seen = new Set(), out = [];
    for (const item of raw) {
      const p = typeof item === 'string' ? item : (item && typeof item === 'object' ? (item.image || item.src || '') : '');
      if (typeof p !== 'string' || !p.trim()) continue;
      const key = clean(p);
      if (!key || seen.has(key) || /placeholder-\d+\.svg$/i.test(key)) continue;
      seen.add(key); out.push(p.trim());
    }
    return out;
  }
  // Bare address or mailto: (with or without a query). Anything else, including a made-up value, is not an address.
  function mailAddress(v) {
    if (v == null) return '';
    let s = String(v).trim();
    if (!s) return '';
    const mailto = s.match(/^mailto:\s*([^?\s#]+)/i);
    if (mailto) { try { s = decodeURIComponent(mailto[1]); } catch { s = mailto[1]; } }
    else {
      s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
      if (/[\/?#]/.test(s)) return '';   // a page address (tiktok.com/@name), not an email
    }
    s = s.trim();
    return /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(s) ? s : '';
  }
  const mailtoHref = (addr) => 'mailto:' + encodeURIComponent(addr).replace(/%40/g, '@');
  const isEmailLink = (l) => {
    if (!l) return false;
    const label = String(l.label || '').trim().toLowerCase();
    if (label === 'email' || label === 'e-mail' || label === 'mail') return true;
    return !!mailAddress(l.url);
  };

  $('#yr').textContent = new Date().getFullYear();
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  // nav: solid background after the hero, active link, mobile menu
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#menuBtn').addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', o); });
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', false); }));
  const secIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('active', a.dataset.nav === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'portfolio', 'commissions', 'contact'].forEach(id => secIO.observe(document.getElementById(id)));

  // gentle fade-in on scroll
  const io = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .05 }) : null;
  const observe = (el) => io ? io.observe(el) : el.classList.add('in');
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.96 && r.bottom > 0; };
  document.querySelectorAll('.fade').forEach(el => { if (reduce || inView(el)) el.classList.add('in'); else observe(el); });

  // Artwork, music and CMS JSON are not kept for offline use. Say so, plainly, when there is no connection.
  const showOfflineNote = () => {
    if ($('#offlineNote')) return;
    const n = document.createElement('p');
    n.id = 'offlineNote'; n.className = 'offline-note'; n.setAttribute('role', 'status');
    n.textContent = 'An internet connection is needed for artwork, music and the latest portfolio. They are not saved on this device.';
    document.body.prepend(n);
  };
  const hideOfflineNote = () => $('#offlineNote')?.remove();
  if (!navigator.onLine) showOfflineNote();
  addEventListener('offline', showOfflineNote);
  addEventListener('online', hideOfflineNote);

  // page scroll lock shared by the "See more" panel and the viewer
  let locks = 0;
  function lockScroll(d) {
    const was = locks; locks = Math.max(0, locks + d);
    if (!was && locks) {
      document.body.style.overflow = 'hidden';
      // Only a real desktop scrollbar. On iPad, innerWidth and clientWidth disagree during rotation and a large padding pushes the page sideways.
      const sb = innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = sb > 0 && sb < 24 ? sb + 'px' : '';
    }
    if (was && !locks) { document.body.style.overflow = ''; document.body.style.paddingRight = ''; }
  }
  // The wide portfolio track can leave the visual viewport scrolled sideways after an iPad rotation.
  function pinX() {
    if (document.documentElement.scrollLeft) document.documentElement.scrollLeft = 0;
    if (document.body.scrollLeft) document.body.scrollLeft = 0;
  }
  addEventListener('orientationchange', () => { pinX(); requestAnimationFrame(pinX); setTimeout(pinX, 350); });
  addEventListener('resize', pinX);

  // ---------- welcome section ----------
  const hero = $('#home'), heroBg = $('#heroBg');
  const NO_AI_DEFAULT = '100% hand-drawn. Every piece here is drawn by hand by yazarts. No artificial intelligence is used to create or edit any of this artwork.';
  function renderWelcome(w) {
    if (w.heroTitle != null) $('#heroTitle').textContent = w.heroTitle;
    if (w.heroIntro != null) $('#heroIntro').textContent = w.heroIntro;
    const noAi = $('#noAiText');
    if (noAi) noAi.textContent = String(w.noAiText ?? '').trim() || NO_AI_DEFAULT;
    // full-cover background illustration; without one the calm navy background shows
    const bg = w.heroBackground;
    if (bg) {
      const orig = asset(bg), t = thumb(bg), z = sizeOf(bg);
      // a 1200 px preview for small screens, the original for big / high-density ones (the browser picks)
      if (t !== orig && z) { const tw = z[0] >= z[1] ? 1200 : Math.round(1200 * z[0] / z[1]); heroBg.srcset = `${t} ${tw}w, ${orig} ${z[0]}w`; heroBg.sizes = '100vw'; }
      heroBg.src = orig;
      const ok = () => hero.classList.add('bg-ok');
      heroBg.complete && heroBg.naturalWidth ? ok() : heroBg.addEventListener('load', ok, { once: true });
      heroBg.addEventListener('error', () => hero.classList.add('no-bg'), { once: true });
      hero.classList.remove('no-bg');
    } else { heroBg.removeAttribute('src'); hero.classList.add('no-bg'); }
    bio.set(w);
  }
  // ---------- "See more": the whole story is already there and fades in (no typing, no cursor) ----------
  const bio = (() => {
    const box = $('#bio'), textEl = $('#bioText'), body = $('#bioBody');
    let lastFocus = null, closing = false;
    function set(w) {
      if (w.bioTitle) $('#bioTitle').textContent = w.bioTitle;
      if (w.bioPhoto) $('#bioPhoto').src = asset(w.bioPhoto);
      $('#bioPhoto').closest('figure').hidden = w.bioPhoto === '' || w.bioPhoto === null;
      const paras = w.bio == null ? [] : String(w.bio).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      textEl.innerHTML = paras.map(p => `<p>${esc(p)}</p>`).join('');
    }
    function open() {
      if (!box.hidden) return; lastFocus = document.activeElement; closing = false;
      box.hidden = false; lockScroll(1); body.scrollTop = 0; body.closest('.bio-card').scrollTop = 0;
      textEl.classList.remove('in');
      requestAnimationFrame(() => { box.classList.add('open'); requestAnimationFrame(() => textEl.classList.add('in')); });
      $('#bioClose').focus({ preventScroll: true });
    }
    function close() {
      if (box.hidden || closing) return; closing = true;
      box.classList.remove('open');
      setTimeout(() => { box.hidden = true; textEl.classList.remove('in'); lockScroll(-1); closing = false; lastFocus?.focus?.({ preventScroll: true }); }, reduce ? 0 : 380);
    }
    $('#bioBtn').addEventListener('click', open);
    $('#bioClose').addEventListener('click', close);
    $('#bioBg').addEventListener('click', close);
    addEventListener('keydown', e => {
      if (box.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { const f = [...box.querySelectorAll('button')].filter(x => x.offsetParent); const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus(); }
    });
    return { set, open, close };
  })();

  // ---------- contact: "Not quite what you're looking for?" reveals the social icons ----------
  const ICON = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.1a2.2 2.2 0 0 0-3.7-1.6 10.8 10.8 0 0 0-5.8-1.8l1-4.6 3.2.7a1.6 1.6 0 1 0 .2-1l-3.6-.8a.5.5 0 0 0-.6.4l-1.1 5.3a10.8 10.8 0 0 0-5.9 1.8A2.2 2.2 0 1 0 3.3 14a4.3 4.3 0 0 0 0 .7c0 3.4 3.9 6.1 8.7 6.1s8.7-2.7 8.7-6.1a4.3 4.3 0 0 0 0-.7 2.2 2.2 0 0 0 1.3-1.9ZM7.5 13.6a1.6 1.6 0 1 1 1.6 1.6 1.6 1.6 0 0 1-1.6-1.6Zm9 4.2a5.8 5.8 0 0 1-4.5 1.3 5.8 5.8 0 0 1-4.5-1.3.5.5 0 0 1 .7-.7 4.9 4.9 0 0 0 3.8 1 4.9 4.9 0 0 0 3.8-1 .5.5 0 0 1 .7.7Zm-.4-2.6a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"/></svg>',
    kofi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M10.5 15.5s-3-1.8-3-3.6a1.5 1.5 0 0 1 3-.4 1.5 1.5 0 0 1 3 .4c0 1.8-3 3.6-3 3.6Z" fill="currentColor" stroke="none"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.7 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.2-8.3L1.7 3h6.4l4.4 5.9L17.7 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11 14.5Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3a4.8 4.8 0 0 0 4 4.3v3.2a8 8 0 0 1-4-1.2v6.2A5.7 5.7 0 1 1 10.9 10v3.3a2.5 2.5 0 1 0 2.4 2.5V3h3.3Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15V9l5.8 3-5.8 3Z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  };
  const iconFor = (label, url) => {
    const s = (label + ' ' + url).toLowerCase().replace(/[^a-z]/g, '');
    if (s.includes('instagram')) return ICON.instagram; if (s.includes('reddit')) return ICON.reddit; if (s.includes('kofi')) return ICON.kofi;
    if (s.includes('tiktok')) return ICON.tiktok; if (s.includes('youtube')) return ICON.youtube; if (/twitter|xcom/.test(s) || label.trim().toLowerCase() === 'x') return ICON.x;
    return ICON.link;
  };
  const handle = (url) => { try { const u = new URL(url); const p = u.pathname.split('/').filter(Boolean).pop(); return p ? (p.startsWith('@') ? p : '@' + p) : u.hostname.replace(/^www\./, ''); } catch { return ''; } };


  const contact = (() => {
    const btn = $('#contactBtn'), boxEl = $('#contactBox'), wrapEl = $('#contact');
    function set(c) {
      if (c.buttonLabel) $('#contactLabel').textContent = c.buttonLabel;
      if (c.contactText != null) $('#contactText').textContent = c.contactText;
      const links = (c.links || []).filter(l => l && l.url);
      // An address belongs on the envelope. Drop email-shaped entries here so the chain icon is not a second, broken copy.
      const social = links.filter(l => !isEmailLink(l));
      const addr = mailAddress(c.email) || links.filter(isEmailLink).map(l => mailAddress(l.url)).find(Boolean) || '';
      const mail = addr ? `<li class="mail"><a href="${esc(mailtoHref(addr))}" aria-label="${esc('Email ' + addr)}" title="Email"><span class="ico">${ICON.email}</span><span class="s-name">Email</span></a></li>` : '';
      $('#socials').innerHTML = social.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener me" aria-label="${esc((l.label || handle(l.url)) + ' ' + handle(l.url))}" title="${esc(l.label || '')}">
        <span class="ico">${iconFor(l.label || '', l.url)}</span><span class="s-name">${esc(l.label || handle(l.url))}</span></a></li>`).join('') + mail;
    }
    function toggle(force) {
      const o = force ?? !wrapEl.classList.contains('open');
      wrapEl.classList.toggle('open', o); btn.setAttribute('aria-expanded', o);
    }
    btn.addEventListener('click', () => toggle());
    // the nav's "Contact" link (or a #contact link) opens the icons too
    const fromHash = () => { if (location.hash === '#contact') toggle(true); };
    addEventListener('hashchange', fromHash); fromHash();
    document.querySelectorAll('a[href="#contact"]').forEach(a => a.addEventListener('click', () => toggle(true)));
    return { set, toggle };
  })();

  // ---------- portfolio: a horizontal band of "bricks" in two rows ----------
  // Every tile gets a shape from a repeating mix of wide, square and tall ratios (the picture is cropped to it with
  // object-fit: cover; the image FILE is never changed and the viewer always shows the full, uncropped original).
  // Tiles go into whichever row is shorter, so the seams are staggered like brickwork. The first piece, and any piece
  // marked "Show bigger" in the CMS, is a big tile as tall as both rows. Layout is computed once (and on resize):
  // nothing moves while the band is being swiped.
  const RATIOS = [1.5, 0.8, 1, 1.3, 0.7, 1.15, 1.6, 0.85, 1.05, 0.75];
  const BIG_RATIO = 0.8;
  const pf = (() => {
    const scroller = $('#pfScroll'), track = $('#pfTrack'), wrapEl = $('#pfWrap'), hint = $('#pfHint');
    let lastH = 0, lastW = 0;
    const big = (i) => art[i].featured === true || (i === 0 && innerWidth >= 720);   // phones: the first piece stays in the rows so the brick pattern shows
    const html = (a, i) => `<div class="brick" data-i="${i}" style="--d:${Math.min(i, 8) * 0.03}s"><button class="tile" type="button" data-i="${i}" aria-label="Open artwork ${i + 1} full screen">
        <img src="${esc(thumb(a.image))}" alt="Artwork ${i + 1} by @yazarts" loading="${i < 8 ? 'eager' : 'lazy'}" decoding="async" draggable="false"></button></div>`;
    function pack() {
      const H = track.clientHeight; if (!H || !art.length) return;
      const gap = innerWidth < 720 ? 8 : 12, h = (H - gap) / 2, lanes = [0, 0], rects = [], laneTiles = [[], []];
      let n = 0;
      // stretch the shorter row's tiles (since the last big tile) a little so both rows end flush: no holes, even gaps
      const even = (maxGrow) => {
        const s = lanes[0] < lanes[1] ? 0 : 1, d = Math.abs(lanes[0] - lanes[1]), ts = laneTiles[s];
        if (d < 0.5 || !ts.length) return;
        const total = ts.reduce((a, t) => a + rects[t].w, 0); if (d / total > maxGrow) return;
        let x = rects[ts[0]].x; ts.forEach(t => { rects[t].w += d * rects[t].w / total; rects[t].x = x; x += rects[t].w + gap; }); lanes[s] = lanes[1 - s];
      };
      const used = new Set();
      const putSmall = (i) => {
        const w = h * RATIOS[n++ % RATIOS.length], l = lanes[0] <= lanes[1] ? 0 : 1;
        rects[i] = { x: lanes[l], y: l * (h + gap), w, h }; laneTiles[l].push(i); lanes[l] += w + gap; used.add(i);
      };
      art.forEach((a, i) => {
        if (used.has(i)) return;
        if (!big(i)) return putSmall(i);
        // before a big tile, pull the next small pieces forward while the rows are clearly uneven, then stretch to flush
        for (let j = i + 1; j < art.length && Math.abs(lanes[0] - lanes[1]) > h * 0.45; j++) if (!big(j) && !used.has(j)) putSmall(j);
        even(1.2);
        const x = Math.max(lanes[0], lanes[1]), w = H * BIG_RATIO;
        rects[i] = { x, y: 0, w, h: H }; lanes[0] = lanes[1] = x + w + gap; laneTiles[0] = []; laneTiles[1] = []; used.add(i);
      });
      even(0.45);
      track.style.width = Math.max(lanes[0], lanes[1]) - gap + 'px';
      track.querySelectorAll('.brick').forEach(b => { const r = rects[+b.dataset.i]; if (!r) return;
        b.style.cssText += `;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
        b.classList.toggle('big', r.h === H); });
      lastH = H; lastW = innerWidth; sync();
    }
    function render() {
      track.innerHTML = art.map(html).join('');
      $('#empty').hidden = art.length > 0; wrapEl.hidden = !art.length;
      track.querySelectorAll('.tile img').forEach(im => {
        const ok = () => im.classList.add('ok');
        im.complete && im.naturalWidth ? ok() : im.addEventListener('load', ok, { once: true }); im.addEventListener('error', ok, { once: true });
      });
      pack();
    }
    let packT = 0; const schedule = () => { cancelAnimationFrame(packT); packT = requestAnimationFrame(pack); };
    // iPad Safari fires resize when the address bar shows or hides. Relayout only when the width changes, or the tiles jump mid-swipe.
    addEventListener('resize', () => { if (innerWidth !== lastW) schedule(); });

    // edge fades, arrows and the "swipe" hint follow the scroll position (only classes on the WRAPPER change, and only
    // when the state actually flips, so scrolling never forces the band itself to repaint)
    let st = '';
    function sync() {
      const max = scroller.scrollWidth - scroller.clientWidth, x = scroller.scrollLeft;
      const s = (x < 4 ? 's' : '') + (x > max - 4 ? 'e' : '') + (max < 4 ? 'n' : '') + (x > 30 ? 'm' : '');
      if (s === st) return; st = s;
      wrapEl.classList.toggle('at-start', x < 4); wrapEl.classList.toggle('at-end', x > max - 4); wrapEl.classList.toggle('no-scroll', max < 4);
      $('#pfPrev').disabled = x < 4; $('#pfNext').disabled = x > max - 4;
      if (x > 30) hint.classList.add('gone');
    }
    let ticking = false;
    scroller.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; sync(); }); } if (!anim) target = scroller.scrollLeft; }, { passive: true });
    scroller.addEventListener('touchstart', () => track.classList.add('settled'), { passive: true });

    // Mouse wheel over the band scrolls it sideways until it reaches an end, then the page scrolls on.
    // Trackpads (small pixel deltas) move it 1:1 so their own momentum stays smooth; notched mouse wheels glide.
    // Horizontal trackpad swipes, touch and pinch are left entirely to the browser (native momentum scrolling).
    let target = 0, anim = 0;
    const step = () => {
      const x = scroller.scrollLeft, d = target - x;
      if (Math.abs(d) < 0.6) { scroller.scrollLeft = target; anim = 0; return; }
      scroller.scrollLeft = x + d * 0.2; anim = requestAnimationFrame(step);
    };
    scroller.addEventListener('wheel', e => {
      if (matchMedia('(pointer: coarse)').matches) return;   // finger swipes stay native
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const max = scroller.scrollWidth - scroller.clientWidth; if (max < 4) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? scroller.clientWidth : 1);
      const base = anim ? target : scroller.scrollLeft;
      if ((dy > 0 && base >= max - 1) || (dy < 0 && base <= 1)) return;                  // at the end: let the page scroll
      e.preventDefault();
      if (reduce || (e.deltaMode === 0 && Math.abs(e.deltaY) < 50 && !anim)) { scroller.scrollLeft = Math.max(0, Math.min(max, scroller.scrollLeft + dy)); target = scroller.scrollLeft; return; }
      target = Math.max(0, Math.min(max, base + dy));
      if (!anim) anim = requestAnimationFrame(step);
    }, { passive: false });
    const by = (dir) => { cancelAnimationFrame(anim); anim = 0; scroller.scrollBy({ left: dir * scroller.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' }); };
    $('#pfPrev').addEventListener('click', () => by(-1)); $('#pfNext').addEventListener('click', () => by(1));
    scroller.addEventListener('keydown', e => { if (e.target !== scroller) return; if (e.key === 'ArrowRight') { e.preventDefault(); by(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1); } });

    // desktop mouse: drag-to-scroll with a little momentum (touch and pen use the browser's own swipe + momentum)
    let drag = null, dragged = false;
    scroller.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(anim); anim = 0; drag = { x: e.clientX, s: scroller.scrollLeft, v: 0, lx: e.clientX, lt: performance.now() }; dragged = false;
    });
    addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - drag.x;
      if (!dragged && Math.abs(dx) > 6) { dragged = true; wrapEl.classList.add('dragging'); }
      if (dragged) { scroller.scrollLeft = drag.s - dx; const t = performance.now(); if (t > drag.lt) { drag.v = (e.clientX - drag.lx) / (t - drag.lt); drag.lx = e.clientX; drag.lt = t; } }
    });
    addEventListener('pointerup', () => {
      if (!drag) return; const v = drag.v; drag = null; wrapEl.classList.remove('dragging');
      if (dragged && !reduce && Math.abs(v) > 0.2) { const max = scroller.scrollWidth - scroller.clientWidth; target = Math.max(0, Math.min(max, scroller.scrollLeft - v * 320)); if (!anim) anim = requestAnimationFrame(step); }
    });
    // a drag must not also count as a click on the artwork underneath
    scroller.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

    track.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) open(+t.dataset.i, { list: art, grid: track, tint: null }); });
    // entrance: the bricks rise in one after another the first time the band scrolls into view
    const showBricks = () => { track.classList.add('in'); setTimeout(() => track.classList.add('settled'), 400); };
    if (reduce || inView(track)) showBricks();
    else if ('IntersectionObserver' in window) {
      const eio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { showBricks(); eio.disconnect(); } }), { threshold: 0.05 });
      eio.observe(track);
    } else showBricks();
    return { render, pack, sync };
  })();

  // ---------- background music (the soft blue toggle next to the logo) ----------
  const sound = (() => {
    const bg = $('#bgAudio'), btn = $('#musicBtn'), VOL = 0.35;
    let on = store.get('yaz.sound', true), waiting = false, fadeRaf = 0;
    function fade(to, ms, then) {
      cancelAnimationFrame(fadeRaf); const from = bg.volume, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / ms); try { bg.volume = from + (to - from) * k; } catch { } if (k < 1) fadeRaf = requestAnimationFrame(step); else then?.(); };
      fadeRaf = requestAnimationFrame(step);
    }
    const playing = () => bg.src && !bg.paused;
    function ui() { const p = playing(); btn.classList.toggle('playing', p); btn.setAttribute('aria-pressed', p); btn.setAttribute('aria-label', p ? 'Mute background music' : 'Play background music'); }
    function start() { if (!bg.getAttribute('src')) return Promise.reject(new Error('none')); bg.volume = 0; return (bg.play() || Promise.resolve()).then(() => { fade(VOL, 900); ui(); }); }
    function stop() { if (!bg.paused) fade(0, 450, () => { bg.pause(); ui(); }); }
    // iOS only starts audio inside a real tap, click or key press. Scrolling is not a gesture it accepts.
    const gestureEvents = ['pointerdown', 'touchend', 'click', 'keydown'];
    function waitForGesture() {
      if (waiting || !on) return; waiting = true;
      const go = (e) => {
        if (e.target?.closest?.('#musicBtn')) return;      // the music button handles its own click
        gestureEvents.forEach(t => removeEventListener(t, go, true)); waiting = false;
        if (on && !playing()) start().catch(() => { });
      };
      gestureEvents.forEach(t => addEventListener(t, go, true));
    }
    function setBg(src) {
      if (!src) { btn.hidden = true; return; }
      bg.src = src; bg.loop = true; bg.preload = 'auto'; btn.hidden = false; ui();
      if (!on) return;
      start().catch(() => { });
      waitForGesture();
    }
    btn.addEventListener('click', () => { if (playing()) { on = false; stop(); } else { on = true; start().catch(() => { }); } store.set('yaz.sound', on); ui(); });
    ['play', 'pause', 'ended'].forEach(t => bg.addEventListener(t, ui));
    return { setBg };
  })();

  // ---------- viewer: full-screen artwork only; shared-element open/close, swipe carousel, pinch/double-tap zoom ----------
  const lb = $('#lb'), stage = $('#lbStage'), track = $('#lbTrack'), tintEl = $('#lbTint');
  const EASE = 'cubic-bezier(.22,.8,.24,1)', GAP = 28;
  let idx = 0, panelI = -1, lastFocus = null, W = 0, offset = 0, pendingK = 0, animTimer = 0, closing = false;
  let ctx = { list: [], grid: null, tint: null };      // what the viewer is showing: the portfolio or the commission examples
  const L = () => ctx.list;
  const N = () => L().length, wrap = (i) => ((i % N()) + N()) % N();
  const tileImg = (i) => ctx.grid?.querySelector(`[data-i="${i}"] img`);
  const slides = [0, 1, 2].map(() => { const s = document.createElement('div'); s.className = 'lb-slide'; s.innerHTML = '<img alt="" draggable="false">'; track.appendChild(s); return s; });
  const curImg = () => slides[1].firstElementChild;   // slides = [previous, current, next]
  // Full-resolution originals. A slide is only swapped in after its file has decoded, so WebKit never paints a half-loaded frame.
  const decoded = new Set(), loading = new Map();
  let navToken = 0;
  const srcAt = (i) => { const a = L()[wrap(i)]; return a && a.image ? asset(a.image) : ''; };
  function preload(src) {
    if (!src || decoded.has(src)) return Promise.resolve(!!src && decoded.has(src));
    if (loading.has(src)) return loading.get(src);
    const p = new Promise(resolve => {
      const im = new Image();
      const finish = async (ok) => {
        if (ok) { try { await im.decode(); } catch { } if (im.naturalWidth > 0) decoded.add(src); }
        loading.delete(src);
        resolve(decoded.has(src));
      };
      im.onload = () => finish(true);
      im.onerror = () => finish(false);
      im.src = src;
      if (im.complete) finish(im.naturalWidth > 0);
    });
    loading.set(src, p);
    return p;
  }
  const warm = (i) => { preload(srcAt(i)); preload(srcAt(i - 1)); preload(srcAt(i + 1)); };

  // size each image to "contain" inside its slide (explicit size so small images still fill the space and zoom maths stay exact)
  function fit(im) {
    const s = im.parentElement, cs = getComputedStyle(s);
    const bw = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), bh = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const a = im.naturalWidth ? im.naturalWidth / im.naturalHeight : (L()[+s.dataset.i]?.aspect || 0.75);
    let w = bw, h = w / a; if (h > bh) { h = bh; w = h * a; }
    im._b = { w: Math.max(0, w), h: Math.max(0, h) }; applyZ(im, zs(im));
  }
  function fill(slot, i) {
    const s = slides[slot], im = s.firstElementChild, j = wrap(i), a = L()[j], src = asset(a.image);   // always the untouched original file
    s.dataset.i = j; s.setAttribute('aria-hidden', slot !== 1); im.alt = slot === 1 ? `Artwork ${j + 1} of ${N()} by @yazarts` : '';
    im.style.backgroundImage = '';
    if (im.getAttribute('src') !== src) {
      im.style.opacity = '';
      im.onload = async () => {
        try { await im.decode(); } catch { }
        if (im.naturalWidth > 0) decoded.add(src);
        fit(im); if (j === panelI) setTint(j);
      };
      im.src = src;
      preload(src);
    }
    fit(im);
  }
  function place() {
    const w = W || stage.clientWidth || innerWidth;
    slides.forEach((s, k) => {
      const off = N() < 2 && k !== 1;
      s.classList.toggle('off', off); s.hidden = off;
      s.style.transform = `translate3d(${(k - 1) * (w + GAP)}px,0,0)`;
      if (off) { const im = s.firstElementChild; im.removeAttribute('src'); im.style.backgroundImage = ''; }
    });
  }
  function setOffset(x, ms = 0) { offset = x; track.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none'; track.style.transform = `translate3d(${x}px,0,0)`; }
  function layout() { W = stage.clientWidth || innerWidth; place(); slides.forEach(s => { if (!s.classList.contains('off')) fit(s.firstElementChild); }); lb.classList.toggle('one', N() < 2); }

  // ----- ambient tint: average colour of the artwork (weighted towards saturated pixels), always kept dark -----
  const tints = new Map();
  function colourOf(src, el) {
    if (tints.has(src)) return tints.get(src);
    if (!el || !el.naturalWidth) return null;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 36; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(el, 0, 0, 36, 36); const d = x.getImageData(0, 0, 36, 36).data;
      let R = 0, G = 0, B = 0, T = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, l = (mx + mn) / 510;
        const w = (0.04 + sat * sat) * (l > 0.06 && l < 0.96 ? 1 : 0.15); R += r * w; G += g * w; B += b * w; T += w;
      }
      const r = R / T / 255, g = G / T / 255, b = B / T / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
      let h = 0; if (dl) h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
      const L = (mx + mn) / 2, S = dl ? dl / (1 - Math.abs(2 * L - 1)) : 0;
      const t = { h: Math.round((h * 60 + 360) % 360), s: Math.min(0.62, S * 1.1 + 0.04) }; tints.set(src, t); return t;
    } catch { return null; }
  }
  function setTint(i) {
    const a = L()[i]; if (!a) return; const src = asset(a.image);
    const t = ctx.tint || colourOf(src, tileImg(i)) || colourOf(src, slides.find(s => +s.dataset.i === i)?.firstElementChild);
    const s = t ? Math.round(t.s * 100) : 0;
    tintEl.style.backgroundColor = t ? `hsl(${t.h} ${s}% 13% / .86)` : 'rgba(12,20,32,.7)';    // lightness clamped to 13%: dark, art stays the focus
    lb.dataset.tint = t ? `${t.h},${s}` : '';
  }

  // ----- screen-reader announcement + ambient tint (no titles, likes or views: just the artwork) -----
  function setPanel(i) {
    if (i === panelI) return; panelI = i;
    $('#lbLive').textContent = `Artwork ${i + 1} of ${N()}`;
    setTint(i);
  }

  // ----- carousel -----
  function go(k, v = 0) {
    if (N() < 2) k = 0;
    const dir = k > 0 ? 1 : k < 0 ? -1 : 0;
    if (dir) {
      const src = srcAt(idx + dir);
      if (src && !decoded.has(src)) {
        if (animTimer) { clearTimeout(animTimer); animTimer = 0; }
        pendingK = 0; setOffset(0, 160);
        lb.classList.add('lb-wait');
        const token = ++navToken;
        preload(src).then(ok => {
          if (token !== navToken || lb.hidden) return;
          lb.classList.remove('lb-wait');
          if (ok) go(dir, v);
        });
        return;
      }
    }
    if (animTimer) commit();
    const target = -k * (W + GAP), dist = Math.abs(target - offset);
    pendingK = k; setPanel(wrap(idx + k));
    warm(idx + k);
    if (reduce || dist < 1) { setOffset(target); commit(); return; }
    const sp = Math.abs(v), ms = Math.round(Math.max(200, Math.min(460, sp > 0.25 ? dist / sp * 1.8 : 240 + dist * 0.25)));
    setOffset(target, ms); animTimer = setTimeout(commit, ms + 20);
  }
  function commit() {
    clearTimeout(animTimer); animTimer = 0; const k = pendingK; pendingK = 0;
    if (!k) { setOffset(0); return; }
    resetZoom(curImg()); idx = wrap(idx + k);
    if (k > 0) slides.push(slides.shift()); else slides.unshift(slides.pop());
    setOffset(0); place(); fill(0, idx - 1); fill(1, idx); fill(2, idx + 1);
  }
  function grab() {   // finger lands while a slide is still moving: catch it where it is
    if (!animTimer) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    clearTimeout(animTimer); animTimer = 0; pendingK = 0; setOffset(m.m41);
  }

  // ----- zoom (per image: translate + scale, origin top-left) -----
  const Z = new WeakMap(), zs = (im) => Z.get(im) || { s: 1, tx: 0, ty: 0 };
  // While a zoom is moving, the image is scaled with a CSS transform (smooth). Once it settles, the image is laid out at
  // its real zoomed size instead, so the browser re-draws it from the full-resolution file (a scaled-up transform only
  // magnifies the small screen-sized bitmap, which looked blurry when zooming in).
  function lowForm(im, z) {
    const b = im._b || { w: im.clientWidth, h: im.clientHeight };
    im.style.width = b.w + 'px'; im.style.height = b.h + 'px';
    im.style.transform = z.s === 1 && !z.tx && !z.ty ? '' : `translate3d(${z.tx}px,${z.ty}px,0) scale(${z.s})`;
  }
  function applyZ(im, z, ms = 0, live = false) {
    const prev = Z.get(im); Z.set(im, z); clearTimeout(im._hiT);
    const b = im._b || { w: im.clientWidth, h: im.clientHeight };
    if (z.s > 1.01 && !ms && !live) {
      im.style.transition = 'none'; im.classList.add('hi');
      im.style.width = b.w * z.s + 'px'; im.style.height = b.h * z.s + 'px';
      im.style.transform = `translate3d(${z.tx + (z.s - 1) * b.w / 2}px,${z.ty + (z.s - 1) * b.h / 2}px,0)`;   // flex-centred box grows both ways
    } else {
      if (im.classList.contains('hi')) { im.style.transition = 'none'; lowForm(im, prev || z); void im.offsetWidth; im.classList.remove('hi'); }
      im.style.transition = ms && !reduce ? `transform ${ms}ms ${EASE}` : 'none';
      lowForm(im, z);
      if (z.s > 1.01) im._hiT = setTimeout(() => { if (Z.get(im) === z && gest !== 'pinch') applyZ(im, z); }, (ms && !reduce ? ms : 0) + 140);
    }
    if (im === curImg()) lb.classList.toggle('zoomed', z.s > 1.01);
  }
  const resetZoom = (im, ms = 0) => applyZ(im, { s: 1, tx: 0, ty: 0 }, ms);
  function geom(im) { const r = im.getBoundingClientRect(), z = zs(im); return { ox: r.left - z.tx, oy: r.top - z.ty, w: r.width / z.s, h: r.height / z.s }; }
  function clampZ(im, z, g = geom(im)) {
    const S = stage.getBoundingClientRect(), s = Math.max(1, Math.min(6, z.s));
    const lim = (o, len, t, s0, sl) => { const L = len * s; return L <= sl ? len * (1 - s) / 2 : Math.min(s0 - o, Math.max(s0 + sl - L - o, t)); };
    return { s, tx: lim(g.ox, g.w, z.tx, S.left, S.width), ty: lim(g.oy, g.h, z.ty, S.top, S.height) };
  }
  function zoomAt(im, s, cx, cy, ms = 0, live = false) {
    const z = zs(im), g = geom(im); s = Math.max(1, Math.min(6, s));
    const tx = (cx - g.ox) - (s / z.s) * (cx - g.ox - z.tx), ty = (cy - g.oy) - (s / z.s) * (cy - g.oy - z.ty);
    applyZ(im, clampZ(im, { s, tx, ty }, g), ms, live);
  }
  const toggleZoom = (x, y) => { const im = curImg(); zs(im).s > 1.01 ? resetZoom(im, 280) : zoomAt(im, 2.5, x, y, 300); };

  // ----- one gesture engine for mouse, pen and touch -----
  // 1 finger at zoom 1 → horizontal drag moves the carousel 1:1; 2 fingers → pinch zoom (never navigates);
  // 1 finger while zoomed → pan. Once a second finger has touched, nothing navigates until every finger is lifted.
  const pts = new Map(); let gest = null, multi = false, st = null, pinch = null, samples = [], lastTap = null;
  const dist2 = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch { }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const im = curImg();
    if (pts.size === 1) {
      multi = false; grab(); const z = zs(im);
      st = { x: e.clientX, y: e.clientY, t: performance.now(), off: offset, tx: z.tx, ty: z.ty, onImg: e.target === im, type: e.pointerType };
      samples = [{ x: e.clientX, t: st.t }]; gest = z.s > 1.01 ? 'pan' : 'pending';
    } else if (pts.size === 2) {
      multi = true;
      if (gest === 'drag' || offset) go(0);                 // a second finger cancels any slide in progress
      gest = 'pinch'; const m = dist2(), z = zs(im), g = geom(im); pinch = { d: m.d, x: m.x, y: m.y, ...z, g };
      applyZ(im, z, 0, true);
    }
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const im = curImg(), dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (gest === 'pinch' && pts.size >= 2) {
      const m = dist2(), s = Math.max(0.85, Math.min(7, pinch.s * m.d / pinch.d)), g = pinch.g;
      applyZ(im, { s, tx: (m.x - g.ox) - (s / pinch.s) * (pinch.x - g.ox - pinch.tx), ty: (m.y - g.oy) - (s / pinch.s) * (pinch.y - g.oy - pinch.ty) }, 0, true);
    } else if (gest === 'pending' && !multi) {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * 1.1) { gest = 'drag'; stage.classList.add('dragging'); st.off = offset; }
      else if (Math.abs(dy) > 12) gest = 'none';
    } else if (gest === 'drag') {
      let x = st.off + (e.clientX - st.x); if (N() < 2) x *= 0.3;
      const dir = x < -8 ? 1 : x > 8 ? -1 : 0;
      if (dir && !decoded.has(srcAt(idx + dir))) { x = 0; lb.classList.add('lb-wait'); const held = srcAt(idx + dir); preload(held).then(() => lb.classList.remove('lb-wait')); }
      setOffset(x); const t = performance.now(); samples.push({ x: e.clientX, t }); while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
    } else if (gest === 'pan') {
      const z = zs(im); applyZ(im, clampZ(im, { s: z.s, tx: st.tx + dx, ty: st.ty + dy }));
    }
  });
  function endPointer(e) {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    const im = curImg();
    if (gest === 'pinch') {
      if (pts.size === 1) { const [p] = [...pts.values()], z = zs(im); st = { ...st, x: p.x, y: p.y, tx: z.tx, ty: z.ty }; gest = z.s > 1.01 ? 'pan' : 'none'; }
      if (pts.size <= 1) { const z = zs(im); z.s < 1.05 ? resetZoom(im, 240) : applyZ(im, clampZ(im, z), 240); }
      if (pts.size === 0) gest = null;
      return;
    }
    if (pts.size) return;
    const g = gest; gest = null; stage.classList.remove('dragging');
    if (g === 'drag' && !multi) {
      const a = samples[0], b = samples[samples.length - 1], v = b && a && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
      const p = -(offset + v * 220) / (W + GAP); go(p > 0.32 ? 1 : p < -0.32 ? -1 : 0, v); return;
    }
    const moved = Math.hypot(e.clientX - st.x, e.clientY - st.y), quick = performance.now() - st.t < 350;
    if ((g === 'pending' || (g === 'pan' && moved < 10 && quick)) && !multi && e.type === 'pointerup') {          // a tap / click
      const now = performance.now();
      if (st.type === 'mouse') { if (st.onImg) toggleZoom(e.clientX, e.clientY); else close(); return; }
      if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { lastTap = null; toggleZoom(e.clientX, e.clientY); }
      else lastTap = { t: now, x: e.clientX, y: e.clientY };
      return;
    }
    if (g === 'pan') applyZ(im, clampZ(im, zs(im)), 200);
    if (offset && !animTimer) go(0);
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
  // trackpad pinch / ctrl+wheel zooms the artwork (not the page); plain wheel pans while zoomed
  lb.addEventListener('wheel', e => {
    e.preventDefault(); const im = curImg(), z = zs(im);
    if (e.ctrlKey) zoomAt(im, z.s * Math.exp(-e.deltaY * 0.012), e.clientX, e.clientY, 0, true);
    else if (z.s > 1.01) applyZ(im, clampZ(im, { s: z.s, tx: z.tx - e.deltaX, ty: z.ty - e.deltaY }));
  }, { passive: false });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => lb.addEventListener(t, e => e.preventDefault()));   // Safari: no page pinch-zoom inside the viewer
  lb.addEventListener('touchmove', e => { if (e.touches.length > 1 || !e.target.closest('.lb-panel')) e.preventDefault(); }, { passive: false });
  lb.addEventListener('dblclick', e => e.preventDefault());

  // The viewer fades open in place. No shared-element flight.
  function onScreen(el) {
    if (!el) return null; const r = el.getBoundingClientRect(), sc = el.closest('.pf-scroll')?.getBoundingClientRect();
    if (sc && (r.right < sc.left + 20 || r.left > sc.right - 20)) return null;          // hidden sideways inside the portfolio band
    return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? r : null;
  }
  async function open(i, c) {
    if (!lb.hidden || !c?.list.length) return;
    ctx = c; slides.forEach(s => { const im = s.firstElementChild; im.removeAttribute('src'); im.style.backgroundImage = ''; });
    lastFocus = document.activeElement; idx = i; panelI = -1; closing = false;
    lb.hidden = false; lockScroll(1);
    layout(); fill(0, i - 1); fill(1, i); fill(2, i + 1); setOffset(0); setPanel(i);
    $('#lbClose').focus({ preventScroll: true });
    requestAnimationFrame(() => lb.classList.add('open'));
    warm(i);
  }
  async function close() {
    if (lb.hidden || closing) return; closing = true;
    if (animTimer) commit(); if (offset) setOffset(0);
    const im = curImg(); resetZoom(im);
    ctx.onClose?.(idx);
    lb.classList.remove('open');
    await new Promise(r => setTimeout(r, reduce ? 0 : 280));
    lb.hidden = true; im.style.opacity = ''; lockScroll(-1); closing = false;
    lastFocus?.focus?.({ preventScroll: true });
  }
  $('#lbClose').onclick = close; $('#lbPrev').onclick = () => go(-1); $('#lbNext').onclick = () => go(1);
  addEventListener('resize', () => { if (!lb.hidden) { if (animTimer) commit(); layout(); setOffset(0); resetZoom(curImg()); } });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); return zs(curImg()).s > 1.01 ? resetZoom(curImg(), 240) : close(); }
    if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button')].filter(x => x.offsetParent && getComputedStyle(x).visibility !== 'hidden'); const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === '+' || e.key === '=') { const r = curImg().getBoundingClientRect(); zoomAt(curImg(), zs(curImg()).s * 1.5, r.left + r.width / 2, r.top + r.height / 2, 200); }
    else if (e.key === '-' || e.key === '0') resetZoom(curImg(), 200);
  });

  // ---------- content ----------
  Promise.all([
    json('content/welcome.json').catch(() => ({})), json('content/portfolio.json').catch(() => ({ artworks: [] })),
    json('content/commissions.json').catch(() => ({ tiers: [] })), json('content/contact.json').catch(() => ({ links: [] })),
    json('content/site.json').catch(() => ({})), json('content/thumbs.json').catch(() => ({})),
  ]).then(([w, g, C, K, s, T]) => {
    T = T && typeof T === 'object' ? T : {};
    if (T.thumbs || T.sizes) { thumbs = T.thumbs || {}; sizes = T.sizes || {}; } else thumbs = T;
    if (s.siteName) { $('#brandName').textContent = s.siteName; $('#footName').textContent = s.siteName; }
    if (s.logo) { const logo = $('#brandLogo'); if (logo) logo.src = asset(s.logo); }
    renderWelcome(w);
    art = (g.artworks || []).filter(a => a && a.image);
    pf.render();
    const isOpen = C.open === true;
    $('#commKicker').classList.toggle('closed', !isOpen);
    $('#commKicker').textContent = isOpen ? 'Available for commissions' : 'Commissions closed';
    $('#commText').textContent = (isOpen ? C.openText : C.closedText) || ''; $('#commText').hidden = !$('#commText').textContent;
    const quote = String(C.testimonial ?? '').trim(), by = String(C.testimonialBy ?? '').trim(), quoteEl = $('#quote');
    if (quote) { $('#quoteText').textContent = quote; $('#quoteBy').textContent = by; $('#quoteBy').hidden = !by; quoteEl.hidden = false; }
    else quoteEl.hidden = true;
    tiers = (C.tiers || []).filter(t => t && (t.name || tierImages(t).length)); tierShow.render(tiers);
    contact.set(K);
    sound.setBg(s.music ? asset(s.music) : '');
  });

  // ---------- commissions: auto-advancing slideshow of tiers ----------
  // Every 5 s the next tier comes in. Several photos sit in an offset stack (one photo is just the photo; none leaves the text).
  // Tapping the stack opens those photos only, at full resolution. Pauses on hover, focus, touch and while the viewer is open.
  const tierShow = (() => {
    const box = $('#tiers'), stage = $('#tiersStage'), dots = $('#tDots'), DUR = 5000;
    let list = [], cur = 0, elapsed = 0, last = 0, raf = 0, hover = false, focus = false, touchHold = 0, hidden = document.hidden;
    const letters = (t) => String(t || '').split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' :
      `<span class="w">${[...w].map(c => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join('');
    const stackButton = (imgs, name, eager) => {
      const n = Math.min(imgs.length, 3), load = eager ? 'eager' : 'lazy';
      const cards = imgs.slice(0, n).map((src, i) => `<span class="card c${i}" data-i="${i}"><img src="${esc(thumb(src))}" alt="" decoding="async" loading="${load}" draggable="false"></span>`).join('');
      const label = imgs.length > 1 ? `View ${imgs.length} ${name || 'example'} photos full screen` : `View the ${name || 'example'} photo full screen`;
      return `<button class="tier-open" type="button" aria-label="${esc(label)}"><span class="stack ${imgs.length > 1 ? 'multi n' + n : 'n1'}">${cards}</span></button>`;
    };
    function render(t) {
      list = t.map(x => ({ ...x, images: tierImages(x) })); box.hidden = !list.length; $('#commWhat').hidden = !list.length;
      stage.innerHTML = list.map((t, k) => `<article class="tier${t.images.length ? '' : ' no-photos'}" data-k="${k}" role="group" aria-roledescription="slide" aria-label="${k + 1} of ${list.length}: ${esc(t.name || '')}" aria-hidden="true">
        <div class="tier-media">${t.images.length ? stackButton(t.images, t.name, k === 0) : ''}</div>
        <div class="tier-text">
          <h3 class="tier-name">${letters(t.name)}</h3>
          ${t.description ? `<p class="tier-desc">${esc(t.description)}</p>` : ''}
          ${t.notes ? `<p class="tier-notes">${esc(t.notes)}</p>` : ''}
        </div></article>`).join('');
      stage.querySelectorAll('.tier-name').forEach(h => h.querySelectorAll('.ch').forEach((c, i) => c.style.setProperty('--i', i)));
      dots.innerHTML = list.length > 1 ? list.map((t, k) => `<button type="button" class="t-dot" data-k="${k}" aria-label="Show ${esc(t.name || 'tier ' + (k + 1))}"><i></i></button>`).join('') : '';
      $('#tiersCtrl').hidden = list.length < 2;
      cur = 0; show(0, 0, true);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }
    function show(k, dir = 1, first = false, instant = false) {
      if (!list.length) return; k = ((k % list.length) + list.length) % list.length;
      const els = [...stage.children], prev = els[cur], next = els[k];
      if (!first && k === cur) return;
      els.forEach(e => e.classList.remove('leave', 'back'));
      if (prev && prev !== next) { prev.classList.remove('on'); prev.classList.add('leave'); prev.classList.toggle('back', dir < 0); prev.setAttribute('aria-hidden', 'true'); }
      next.classList.toggle('back', dir < 0); if (instant) { stage.classList.add('instant'); requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('instant'))); }
      void next.offsetWidth; next.classList.add('on'); next.setAttribute('aria-hidden', 'false');
      cur = k; elapsed = 0;
      dots.querySelectorAll('.t-dot').forEach((d, i) => { d.classList.toggle('on', i === k); d.setAttribute('aria-current', i === k ? 'true' : 'false'); d.style.setProperty('--p', 0); });
    }
    const paused = () => reduce || hover || focus || touchHold || hidden || list.length < 2 || !lb.hidden;
    function tick(t) {
      const dt = Math.min(100, t - last); last = t;
      if (!paused() && onScreen(stage)) {
        elapsed += dt;
        dots.querySelector('.t-dot.on')?.style.setProperty('--p', Math.min(1, elapsed / DUR).toFixed(3));
        if (elapsed >= DUR) show(cur + 1, 1);
      }
      box.classList.toggle('paused', paused());
      raf = requestAnimationFrame(tick);
    }
    const go = (d) => show(cur + d, d);
    $('#tPrev').addEventListener('click', () => go(-1)); $('#tNext').addEventListener('click', () => go(1));
    dots.addEventListener('click', e => { const d = e.target.closest('.t-dot'); if (d) { const k = +d.dataset.k; show(k, k < cur ? -1 : 1); } });
    box.addEventListener('mouseenter', () => hover = true); box.addEventListener('mouseleave', () => hover = false);
    box.addEventListener('focusin', () => focus = true); box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) focus = false; });
    box.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; });
    // touch: hold to pause; a sideways swipe changes tier; it resumes 2.5 s after the finger lifts
    let sx = null, sy = 0;
    stage.addEventListener('touchstart', e => { clearTimeout(touchHold); touchHold = -1; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', e => {
      const t = e.changedTouches[0]; if (sx != null) { const dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1); }
      sx = null; touchHold = setTimeout(() => { touchHold = 0; }, 2500);
    }, { passive: true });
    // mouse / pen swipe too
    let px = null, swiped = false;
    stage.addEventListener('pointerdown', e => { swiped = false; if (e.pointerType !== 'touch') px = e.clientX; });
    stage.addEventListener('pointerup', e => { if (px != null && Math.abs(e.clientX - px) > 60) { swiped = true; go(e.clientX < px ? 1 : -1); } px = null; });
    // tapping the stack opens only this tier's photos (original files). The slideshow stays on this tier and stays paused while the viewer is open.
    stage.addEventListener('click', e => {
      const b = e.target.closest('.tier-open'); if (!b || swiped) return;
      const article = b.closest('.tier'), tier = list[+article.dataset.k], imgs = tier?.images || [];
      if (!imgs.length) return;
      const card = e.target.closest('.card');
      const start = card && card.dataset.i != null ? Math.min(Math.max(0, +card.dataset.i), imgs.length - 1) : 0;
      open(start, { list: imgs.map(image => ({ image })), grid: article, tint: null });
    });
    return { render, show, get cur() { return cur; } };
  })();

  // Install: use the browser prompt where it exists. Everywhere else, a short modal with the real steps.
  const installBtn = $('#installBtn'), installModal = $('#installModal'), installSteps = $('#installSteps');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const installHelp = () => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) return 'Tap the Share button, then Add to Home Screen, then Add.';
    if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua)) return 'In the menu bar, choose File, then Add to Dock.';
    if (/Firefox/.test(ua)) return 'Open the browser menu and choose Install if it is listed.';
    return 'Open the browser menu and choose Install app, or use the install icon in the address bar.';
  };
  const closeInstall = () => { if (installModal) installModal.hidden = true; };
  if (installBtn && !standalone) {
    installBtn.hidden = false;
    let deferred = null;
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
    installBtn.addEventListener('click', async () => {
      if (deferred && typeof deferred.prompt === 'function') {
        deferred.prompt();
        try { await deferred.userChoice; } catch { }
        deferred = null; installBtn.hidden = true; return;
      }
      if (installSteps) installSteps.textContent = installHelp();
      if (installModal) { installModal.hidden = false; $('#installClose')?.focus(); }
    });
    addEventListener('appinstalled', () => { installBtn.hidden = true; closeInstall(); });
    $('#installClose')?.addEventListener('click', closeInstall);
    $('#installBg')?.addEventListener('click', closeInstall);
    addEventListener('keydown', e => { if (e.key === 'Escape' && installModal && !installModal.hidden) closeInstall(); });
  }
  const noAiBtn = $('#noAiBtn'), noAiPop = $('#noAiPop');
  const closeNoAi = () => {
    if (!noAiPop || noAiPop.hidden) return;
    noAiPop.hidden = true;
    noAiBtn?.setAttribute('aria-expanded', 'false');
    noAiBtn?.focus();
  };
  if (noAiBtn && noAiPop) {
    noAiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (noAiPop.hidden) { noAiPop.hidden = false; noAiBtn.setAttribute('aria-expanded', 'true'); $('#noAiClose')?.focus(); }
      else closeNoAi();
    });
    $('#noAiClose')?.addEventListener('click', (e) => { e.stopPropagation(); closeNoAi(); });
    document.addEventListener('click', (e) => {
      if (noAiPop.hidden) return;
      if (e.target.closest('#noAiPop') || e.target.closest('#noAiBtn')) return;
      closeNoAi();
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !noAiPop.hidden) { e.preventDefault(); e.stopPropagation(); closeNoAi(); }
    }, true);
  }

  if ('serviceWorker' in navigator && !navigator.webdriver) {
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshed) return; refreshed = true; location.reload(); });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
})();
