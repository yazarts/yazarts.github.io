(() => {
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // CMS stores paths like "/images/x.jpg"; make them relative so the site works at the domain root (yazarts.github.io) AND under any sub-path
  const asset = (p) => !p ? '' : /^(https?:)?\/\//.test(p) ? p : String(p).replace(/^\/+/, '');
  const json = (u) => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  let art = [], albums = [], tiers = [], thumbs = {}, sizes = {};
  // grid thumbnails + image sizes are generated at deploy time (content/thumbs.json); the viewer always loads the untouched original
  const clean = (p) => asset(p).split(/[?#]/)[0];
  const thumb = (p) => thumbs[clean(p)] || asset(p);
  const sizeOf = (p) => sizes[clean(p)] || null;          // [w, h] or null (then read from the image when it loads)

  $('#yr').textContent = new Date().getFullYear();
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  // nav: solid background after the hero, active link, mobile menu
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#menuBtn').addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', o); });
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', false); }));
  const secIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('active', a.dataset.nav === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'portfolio', 'albums', 'commissions', 'about', 'connect'].forEach(id => secIO.observe(document.getElementById(id)));

  // gentle fade-in on scroll
  const io = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .05 }) : null;
  const observe = (el) => io ? io.observe(el) : el.classList.add('in');
  document.querySelectorAll('.fade').forEach(observe);

  const ICON = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.1a2.2 2.2 0 0 0-3.7-1.6 10.8 10.8 0 0 0-5.8-1.8l1-4.6 3.2.7a1.6 1.6 0 1 0 .2-1l-3.6-.8a.5.5 0 0 0-.6.4l-1.1 5.3a10.8 10.8 0 0 0-5.9 1.8A2.2 2.2 0 1 0 3.3 14a4.3 4.3 0 0 0 0 .7c0 3.4 3.9 6.1 8.7 6.1s8.7-2.7 8.7-6.1a4.3 4.3 0 0 0 0-.7 2.2 2.2 0 0 0 1.3-1.9ZM7.5 13.6a1.6 1.6 0 1 1 1.6 1.6 1.6 1.6 0 0 1-1.6-1.6Zm9 4.2a5.8 5.8 0 0 1-4.5 1.3 5.8 5.8 0 0 1-4.5-1.3.5.5 0 0 1 .7-.7 4.9 4.9 0 0 0 3.8 1 4.9 4.9 0 0 0 3.8-1 .5.5 0 0 1 .7.7Zm-.4-2.6a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"/></svg>',
    kofi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M10.5 15.5s-3-1.8-3-3.6a1.5 1.5 0 0 1 3-.4 1.5 1.5 0 0 1 3 .4c0 1.8-3 3.6-3 3.6Z" fill="currentColor" stroke="none"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.7 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.2-8.3L1.7 3h6.4l4.4 5.9L17.7 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11 14.5Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3a4.8 4.8 0 0 0 4 4.3v3.2a8 8 0 0 1-4-1.2v6.2A5.7 5.7 0 1 1 10.9 10v3.3a2.5 2.5 0 1 0 2.4 2.5V3h3.3Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15V9l5.8 3-5.8 3Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  };
  const iconFor = (label, url) => {
    const s = (label + ' ' + url).toLowerCase().replace(/[^a-z]/g, '');
    if (s.includes('instagram')) return ICON.instagram; if (s.includes('reddit')) return ICON.reddit; if (s.includes('kofi')) return ICON.kofi;
    if (s.includes('tiktok')) return ICON.tiktok; if (s.includes('youtube')) return ICON.youtube; if (/twitter|xcom/.test(s) || label.trim().toLowerCase() === 'x') return ICON.x;
    return ICON.link;
  };
  const handle = (url) => { try { const u = new URL(url); const p = u.pathname.split('/').filter(Boolean).pop(); return p ? (p.startsWith('@') ? p : '@' + p) : u.hostname.replace(/^www\./, ''); } catch { return ''; } };


  function renderSite(s) {
    if (s.siteName) { $('#brandName').textContent = s.siteName; $('#footName').textContent = s.siteName; }
    if (s.heroTitle != null) $('#heroTitle').textContent = s.heroTitle;
    if (s.heroSubtitle != null) $('#heroSubtitle').textContent = s.heroSubtitle;
    const intro = s.heroIntro ?? s.tagline; if (intro != null) $('#heroIntro').textContent = intro;
    $('#heroIntro').hidden = !$('#heroIntro').textContent.trim();
    const hi = $('#heroImg');
    if (s.heroImage) { const src = asset(s.heroImage); if (hi.getAttribute('src') !== src) hi.src = src; }
    hi.alt = s.heroImageAlt || 'Artwork by @yazarts';
    $('#home').classList.toggle('no-img', s.heroImage === '');
    $('#aboutText').textContent = s.about || '';
    $('#about').hidden = !s.about;
    const open = s.commissionsOpen !== false;
    $('#commKicker').classList.toggle('closed', !open);
    $('#commKicker').textContent = open ? 'Open for commissions!' : 'Commissions closed for now';
    $('#commText').textContent = (open ? s.commissionText : s.commissionClosedText) || '';
    $('#commText').hidden = !$('#commText').textContent;
    $('#links').innerHTML = (s.links || []).filter(l => l && l.url).map(l => `
      <li><a href="${esc(l.url)}" target="_blank" rel="noopener me"><span class="ico">${iconFor(l.label || '', l.url)}</span>
        <span><strong>${esc(l.label || handle(l.url))}</strong><small>${esc(handle(l.url))}</small></span>
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a></li>`).join('');
  }
  const heroImg = $('#heroImg'); const heroOk = () => $('#home').classList.add('img-ok');
  heroImg.complete && heroImg.naturalWidth ? heroOk() : heroImg.addEventListener('load', heroOk);
  heroImg.addEventListener('error', () => $('#home').classList.add('no-img'));

  // ---------- likes ----------
  // Free, no-signup counter API (Abacus). One counter per artwork: <namespace>/like-<image file name>.
  // If the API is slow or down, the count is simply hidden; the heart still works and the like is sent later.
  // NOTE: the namespace is the site's ORIGINAL id; keep it unchanged, or every existing like and view count resets to 0.
  const LIKES = { api: 'https://abacus.jasoncameron.dev', ns: 'yazartsgallery' };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  };
  const artId = (image) => String(image || '').split('/').pop().replace(/\.[a-z0-9]+$/i, '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 58) || 'art';
  const likeKey = (id) => `like-${id}`;               // Abacus keys: ^[A-Za-z0-9_.-]{3,64}$
  const liked = () => store.get('yaz.liked', {});      // { artId: 1 } — one like per browser
  const pending = () => store.get('yaz.pendingLikes', []);
  const fmt = (n) => n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
  const counts = {};                                   // artId -> number (unknown = undefined)

  // tiny request queue: stays well under Abacus' limit of 30 requests / 10 s per visitor
  const q = []; let active = 0, stamps = [], pauseUntil = 0;
  function pump() {
    while (q.length && active < 4) {
      const now = Date.now(); stamps = stamps.filter(t => now - t < 10000);
      const wait = Math.max(pauseUntil - now, stamps.length >= 24 ? 10000 - (now - stamps[0]) + 50 : 0);
      if (wait > 0) { setTimeout(pump, wait); return; }
      const job = q.shift(); active++; stamps.push(now);
      job().finally(() => { active--; pump(); });
    }
  }
  const api = (path) => new Promise((resolve, reject) => {
    q.push(async () => {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(`${LIKES.api}/${path}`, { signal: ctl.signal, cache: 'no-store' });
        if (r.status === 404) return resolve(0);                    // (not expected: /info answers 200 for new keys)
        if (r.status === 429) { pauseUntil = Date.now() + 10000; return reject(new Error('busy')); }
        if (!r.ok) return reject(new Error('http ' + r.status));
        const d = await r.json(); if (d.exists === false) return resolve(0);   // nobody has liked / viewed it yet
        Number.isFinite(d.value) ? resolve(Math.max(0, d.value)) : reject(new Error('bad'));
      } catch (e) { reject(e); } finally { clearTimeout(t); }
    }); pump();
  });
  // "/info" answers 200 with {exists:false} for counters nobody has hit yet, so new pieces cause no 404s in the console
  const getCount = (id) => api(`info/${LIKES.ns}/${likeKey(id)}`);
  const hitCount = (id) => api(`hit/${LIKES.ns}/${likeKey(id)}`);
  const viewKey = (id) => `view-${id}`;
  const views = {};                                    // artId -> number of views
  const getViews = (id) => api(`info/${LIKES.ns}/${viewKey(id)}`);
  const hitViews = (id) => api(`hit/${LIKES.ns}/${viewKey(id)}`);

  function paint(id) {
    const on = !!liked()[id], n = counts[id], v = views[id];
    document.querySelectorAll(`.like[data-art="${id}"]`).forEach(b => {
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', (on ? 'Liked' : 'Like') + (n != null ? ` (${n} like${n === 1 ? '' : 's'})` : ''));
      const c = b.querySelector('.n'); c.hidden = n == null; c.textContent = n != null ? fmt(n) : '';
    });
    document.querySelectorAll(`.views[data-art="${id}"]`).forEach(b => {
      b.hidden = v == null; b.setAttribute('aria-label', v != null ? `${v} view${v === 1 ? '' : 's'}` : 'Views');
      const c = b.querySelector('.n'); c.hidden = v == null; c.textContent = v != null ? fmt(v) : '';
    });
  }
  const requested = new Set(), requestedV = new Set();
  function loadCount(id) {
    if (!requested.has(id)) {
      requested.add(id);
      getCount(id).then(v => { counts[id] = Math.max(v, counts[id] || 0); paint(id); })
        .catch(() => { requested.delete(id); paint(id); });          // count stays hidden; retried next time it scrolls into view
    }
    if (!requestedV.has(id) && !seenNow.has(id)) {
      requestedV.add(id);
      getViews(id).then(v => { views[id] = Math.max(v, views[id] || 0); paint(id); }).catch(() => { requestedV.delete(id); });
    }
  }
  // a view = the piece was opened in the viewer; counted once per piece per browser session
  const seenNow = new Set();
  function countView(id) {
    let seen; try { seen = JSON.parse(sessionStorage.getItem('yaz.viewed')) || {}; } catch { seen = {}; }
    if (seen[id] || seenNow.has(id)) return; seenNow.add(id);
    seen[id] = 1; try { sessionStorage.setItem('yaz.viewed', JSON.stringify(seen)); } catch { }
    if (views[id] != null) { views[id]++; paint(id); }
    hitViews(id).then(v => { views[id] = v; paint(id); }).catch(() => { });
  }
  const pop = (b) => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
  function like(id, btn) {
    pop(btn); const L = liked(); if (L[id]) return;      // already liked from this browser
    L[id] = 1; store.set('yaz.liked', L);
    if (counts[id] != null) counts[id]++; paint(id);
    send(id);
  }
  function send(id) {
    hitCount(id).then(v => { counts[id] = v; store.set('yaz.pendingLikes', pending().filter(x => x !== id)); paint(id); })
      .catch(() => { const p = pending(); if (!p.includes(id)) store.set('yaz.pendingLikes', [...p, id]); });   // try again on the next visit
  }

  // ---------- artwork cards (inside albums) ----------
  const cio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) loadCount(e.target.dataset.art); }), { rootMargin: '400px 0px' }) : null;
  const cardHTML = (a, i) => {
    const label = a.title || a.caption || `Artwork ${i + 1}`;
    return `<div class="card fade" style="--d:${(i % 4) * 0.07}s"><button class="tile" data-i="${i}" aria-label="Open ${esc(label)}">
      <img src="${esc(thumb(a.image))}" alt="${esc(label)}" loading="${i < 8 ? 'eager' : 'lazy'}" decoding="async">
      ${a.title ? `<span class="cap">${esc(a.title)}</span>` : ''}</button>
      <div class="meta"><button class="like" type="button" data-art="${esc(a.id)}" aria-pressed="false" aria-label="Like"><svg aria-hidden="true"><use href="#i-heart"/></svg><span class="n" hidden></span></button>
      <span class="views" data-art="${esc(a.id)}" aria-label="Views" hidden><svg aria-hidden="true"><use href="#i-eye"/></svg><span class="n" hidden></span></span></div></div>`;
  };
  function renderCards(grid, list) {
    grid.innerHTML = list.map(cardHTML).join('');
    grid.querySelectorAll('.card').forEach(t => { observe(t); t.addEventListener('transitionend', () => t.classList.add('done'), { once: true }); });
    grid.querySelectorAll('.tile img').forEach((im, i) => { const ok = () => { im.classList.add('ok'); if (im.naturalWidth && !list[i].aspect) list[i].aspect = im.naturalWidth / im.naturalHeight; }; im.complete && im.naturalWidth ? ok() : im.addEventListener('load', ok, { once: true }); im.addEventListener('error', () => im.classList.add('ok'), { once: true }); });
    grid.querySelectorAll('.like').forEach(b => { paint(b.dataset.art); cio ? cio.observe(b) : loadCount(b.dataset.art); });
  }

  // ---------- portfolio: a horizontal band of "bricks" that keep each image's natural shape ----------
  // Two lanes (rows) of equal height; every piece keeps its own aspect ratio, so its width follows from its shape.
  // Each piece goes into whichever lane is shorter (like masonry turned sideways). The first piece, and any piece
  // marked "featured" in the CMS, is a big tile spanning both lanes; before placing one, the next small pieces may be
  // pulled forward to even the lanes out, and any small leftover is spread as extra spacing so there are no holes.
  const pf = (() => {
    const scroller = $('#pfScroll'), track = $('#pfTrack'), wrapEl = $('#pfWrap'), hint = $('#pfHint');
    let laid = false, lastH = 0, lastW = 0;
    const aspectOf = (a) => { const z = sizeOf(a.image); return a.aspect || (z && z[0] && z[1] ? z[0] / z[1] : 0.75); };
    const html = (a, i) => {
      const label = a.title || a.caption || `Artwork ${i + 1}`;
      return `<div class="brick" data-i="${i}" style="--d:${Math.min(i, 10) * 0.06}s"><button class="tile" type="button" data-i="${i}" aria-label="Open ${esc(label)}">
        <img src="${esc(thumb(a.image))}" alt="${esc(label)}" loading="${i < 8 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
        ${a.title ? `<span class="cap">${esc(a.title)}</span>` : ''}</button>
        <div class="meta"><button class="like" type="button" data-art="${esc(a.id)}" aria-pressed="false" aria-label="Like"><svg aria-hidden="true"><use href="#i-heart"/></svg><span class="n" hidden></span></button>
        <span class="views" data-art="${esc(a.id)}" aria-label="Views" hidden><svg aria-hidden="true"><use href="#i-eye"/></svg><span class="n" hidden></span></span></div></div>`;
    };
    function pack() {
      const H = track.clientHeight; if (!H || !art.length) return;
      const gap = innerWidth < 720 ? 8 : 12, h = (H - gap) / 2, lanes = [0, 0], rects = [], laneTiles = [[], []];
      const big = (i) => i === 0 || art[i].featured === true;
      const order = art.map((_, i) => i), used = new Set();
      const putSmall = (i) => {
        const w = Math.max(40, h * aspectOf(art[i])), l = lanes[0] <= lanes[1] ? 0 : 1;
        rects[i] = { x: lanes[l], y: l * (h + gap), w, h }; laneTiles[l].push(i); lanes[l] += w + gap; used.add(i);
      };
      for (let k = 0; k < order.length; k++) {
        const i = order[k]; if (used.has(i)) continue;
        if (!big(i)) { putSmall(i); continue; }
        // even the lanes out with up to 3 of the following small pieces, but only while that actually helps
        for (let look = k + 1, n = 0; look < order.length && n < 3; look++) {
          const j = order[look]; if (used.has(j) || big(j)) break;
          const d = Math.abs(lanes[0] - lanes[1]), w = h * aspectOf(art[j]) + gap;
          if (d < h * 0.12 || Math.abs(d - w) >= d) break;
          putSmall(j); n++;
        }
        // spread what is left over the shorter lane's pieces since the last big tile, so it ends flush
        const short = lanes[0] < lanes[1] ? 0 : 1, d = Math.abs(lanes[0] - lanes[1]), ts = laneTiles[short];
        if (d > 0.5 && ts.length) ts.forEach((t, n) => { rects[t].x += d * (n + 1) / ts.length; });
        const x = Math.max(lanes[0], lanes[1]), w = H * aspectOf(art[i]);
        rects[i] = { x, y: 0, w, h: H }; lanes[0] = lanes[1] = x + w + gap; laneTiles[0] = []; laneTiles[1] = []; used.add(i);
      }
      track.style.width = Math.max(lanes[0], lanes[1]) - gap + 'px';
      track.querySelectorAll('.brick').forEach(b => { const r = rects[+b.dataset.i]; if (!r) return;
        b.style.left = r.x + 'px'; b.style.top = r.y + 'px'; b.style.width = r.w + 'px'; b.style.height = r.h + 'px';
        b.classList.toggle('big', r.h === H); });
      lastH = H; lastW = innerWidth; laid = true; sync();
    }
    function render() {
      track.innerHTML = art.map(html).join('');
      $('#empty').hidden = art.length > 0; wrapEl.hidden = !art.length; $('.pf-nav').hidden = !art.length;
      track.querySelectorAll('.tile img').forEach((im, i) => {
        const ok = () => {
          im.classList.add('ok');
          if (im.naturalWidth && !sizeOf(art[i].image)) {        // size not in the manifest (e.g. local preview): measure and re-pack once
            const a = im.naturalWidth / im.naturalHeight; if (Math.abs(a - aspectOf(art[i])) > 0.01) { art[i].aspect = a; schedule(); }
          }
        };
        im.complete && im.naturalWidth ? ok() : im.addEventListener('load', ok, { once: true }); im.addEventListener('error', () => im.classList.add('ok'), { once: true });
      });
      track.querySelectorAll('.like').forEach(b => { paint(b.dataset.art); cio ? cio.observe(b) : loadCount(b.dataset.art); });
      pack();
    }
    let packT = 0; const schedule = () => { cancelAnimationFrame(packT); packT = requestAnimationFrame(pack); };
    addEventListener('resize', () => { if (track.clientHeight !== lastH || innerWidth !== lastW) schedule(); });

    // edge fades, arrows and the "swipe" hint follow the scroll position
    function sync() {
      const max = scroller.scrollWidth - scroller.clientWidth, x = scroller.scrollLeft;
      scroller.classList.toggle('at-start', x < 4); scroller.classList.toggle('at-end', x > max - 4);
      scroller.classList.toggle('no-scroll', max < 4);
      $('#pfPrev').disabled = x < 4; $('#pfNext').disabled = x > max - 4;
      if (x > 30) hint.classList.add('gone');
    }
    scroller.addEventListener('scroll', () => { sync(); if (!anim) target = scroller.scrollLeft; }, { passive: true });

    // mouse wheel / trackpad: vertical wheel scrolls the band sideways (smoothly) until it reaches an end, then the page scrolls on
    let target = 0, anim = 0;
    const step = () => {
      const x = scroller.scrollLeft, d = target - x;
      if (Math.abs(d) < 0.6) { scroller.scrollLeft = target; anim = 0; return; }
      scroller.scrollLeft = x + d * 0.2; anim = requestAnimationFrame(step);
    };
    scroller.addEventListener('wheel', e => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;                 // real horizontal swipes and pinch stay native
      const max = scroller.scrollWidth - scroller.clientWidth; if (max < 4) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? scroller.clientWidth : 1);
      const base = anim ? target : scroller.scrollLeft;
      if ((dy > 0 && base >= max - 1) || (dy < 0 && base <= 1)) return;                  // at the end: let the page scroll
      e.preventDefault(); target = Math.max(0, Math.min(max, base + dy));
      if (reduce) { scroller.scrollLeft = target; return; }
      if (!anim) anim = requestAnimationFrame(step);
    }, { passive: false });
    const by = (dir) => { cancelAnimationFrame(anim); anim = 0; scroller.scrollBy({ left: dir * scroller.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' }); };
    $('#pfPrev').addEventListener('click', () => by(-1)); $('#pfNext').addEventListener('click', () => by(1));
    scroller.addEventListener('keydown', e => { if (e.target !== scroller) return; if (e.key === 'ArrowRight') { e.preventDefault(); by(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1); } });

    // mouse drag-to-scroll with a little momentum (touch uses the browser's own swipe + momentum)
    let drag = null, dragged = false;
    scroller.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.like')) return;
      cancelAnimationFrame(anim); anim = 0; drag = { x: e.clientX, s: scroller.scrollLeft, t: performance.now(), v: 0, lx: e.clientX, lt: performance.now() }; dragged = false;
    });
    addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - drag.x;
      if (!dragged && Math.abs(dx) > 6) { dragged = true; scroller.classList.add('dragging'); }
      if (dragged) { scroller.scrollLeft = drag.s - dx; const t = performance.now(); if (t > drag.lt) { drag.v = (e.clientX - drag.lx) / (t - drag.lt); drag.lx = e.clientX; drag.lt = t; } }
    });
    addEventListener('pointerup', () => {
      if (!drag) return; const v = drag.v; drag = null; scroller.classList.remove('dragging');
      if (dragged && !reduce && Math.abs(v) > 0.2) { const max = scroller.scrollWidth - scroller.clientWidth; target = Math.max(0, Math.min(max, scroller.scrollLeft - v * 320)); if (!anim) anim = requestAnimationFrame(step); }
    });
    // a drag must not also count as a click on the artwork underneath
    scroller.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

    track.addEventListener('click', e => {
      const t = e.target.closest('.tile'); if (t) return open(+t.dataset.i, { list: art, grid: track, tint: null });
      const b = e.target.closest('.like'); if (b) like(b.dataset.art, b);
    });
    // entrance: the bricks rise in one after another when the band first scrolls into view
    if (!reduce && 'IntersectionObserver' in window) {
      const eio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { track.classList.add('in'); eio.disconnect(); } }), { threshold: 0.15 });
      eio.observe(track);
    } else track.classList.add('in');
    return { render, pack, sync };
  })();

  // ---------- albums ----------
  const albumGrid = $('#albumGrid'), av = $('#av'), avGrid = $('#avGrid'), avCover = $('#avCover');
  let curAlbum = null, albumBusy = false;
  function renderAlbums() {
    albumGrid.innerHTML = albums.map((al, k) => `<div class="album-card fade" style="--d:${(k % 4) * 0.07}s">
      <button class="album-tile" type="button" data-k="${k}" aria-label="Open album ${esc(al.name)}">
        ${al.cover ? `<img src="${esc(thumb(al.cover))}" alt="" decoding="async" loading="lazy">` : '<span class="album-blank" aria-hidden="true"></span>'}
        ${al.music ? '<span class="album-note" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg></span>' : ''}
      </button>
      <div class="album-info"><strong>${esc(al.name)}</strong><small>${al.items.length} artwork${al.items.length === 1 ? '' : 's'}</small></div></div>`).join('');
    albumGrid.querySelectorAll('.album-card').forEach(observe);
    albumGrid.querySelectorAll('img').forEach(im => { const ok = () => im.classList.add('ok'); im.complete && im.naturalWidth ? ok() : im.addEventListener('load', ok, { once: true }); });
    $('#albumsEmpty').hidden = albums.length > 0;
  }
  albumGrid.addEventListener('click', e => { const t = e.target.closest('.album-tile'); if (t) openAlbum(+t.dataset.k); });
  const darkTint = (t) => t ? `hsl(${t.h} ${Math.round(t.s * 100)}% 13% / .86)` : 'rgba(12,20,32,.7)';
  async function openAlbum(k) {
    const al = albums[k]; if (!al || albumBusy || !av.hidden) return; albumBusy = true; curAlbum = al;
    lastAlbumFocus = document.activeElement;
    const tile = albumGrid.querySelector(`.album-tile[data-k="${k}"]`), timg = tile?.querySelector('img');
    al.tint = al.tint || (al.cover && timg ? colourOf(thumb(al.cover), timg) : null);
    $('#avName').textContent = al.name; $('#avCount').textContent = `${al.items.length} artwork${al.items.length === 1 ? '' : 's'}`;
    $('#avDesc').textContent = al.description || ''; $('#avDesc').hidden = !al.description;
    avCover.hidden = !al.cover; if (al.cover) avCover.src = thumb(al.cover);
    $('#avTint').style.backgroundColor = darkTint(al.tint); av.dataset.tint = al.tint ? `${al.tint.h},${Math.round(al.tint.s * 100)}` : '';
    renderCards(avGrid, al.items); $('#avEmpty').hidden = al.items.length > 0;
    avGrid.querySelectorAll('.card').forEach((c, i) => c.style.setProperty('--d', (0.18 + Math.min(i, 11) * 0.045) + 's'));
    av.hidden = false; lockScroll(1); $('#avScroll').scrollTop = 0;
    sound.album(al);
    $('#avClose').focus({ preventScroll: true });
    const r0 = !reduce && timg && onScreen(timg);
    requestAnimationFrame(() => av.classList.add('open'));
    if (r0 && al.cover) {
      avCover.style.opacity = '0'; timg.style.visibility = 'hidden';
      await fly(r0, avCover.getBoundingClientRect(), timg.currentSrc || timg.src, 14, 10, 460, av);
      avCover.style.opacity = ''; timg.style.visibility = ''; flyer?.remove(); flyer = null;
    }
    albumBusy = false;
  }
  let lastAlbumFocus = null;
  async function closeAlbum() {
    if (av.hidden || albumBusy || !lb.hidden) return; albumBusy = true;
    const k = albums.indexOf(curAlbum), timg = albumGrid.querySelector(`.album-tile[data-k="${k}"] img`);
    sound.album(null);
    const r1 = !reduce && timg && onScreen(timg), r0 = !avCover.hidden && onScreen(avCover);
    av.classList.remove('open');
    if (r1 && r0) {
      avCover.style.opacity = '0'; timg.style.visibility = 'hidden';
      await fly(r0, r1, avCover.currentSrc || avCover.src, 10, 14, 400, av);
      timg.style.visibility = '';
    } else await new Promise(r => setTimeout(r, reduce ? 0 : 360));
    av.hidden = true; avCover.style.opacity = ''; flyer?.remove(); flyer = null; avGrid.innerHTML = ''; lockScroll(-1); curAlbum = null; albumBusy = false;
    lastAlbumFocus?.focus?.({ preventScroll: true });
  }
  $('#avClose').onclick = closeAlbum;
  avGrid.addEventListener('click', e => {
    const t = e.target.closest('.tile'); if (t && curAlbum) return open(+t.dataset.i, { list: curAlbum.items, grid: avGrid, tint: curAlbum.tint || null });
    const b = e.target.closest('.like'); if (b) like(b.dataset.art, b);
  });
  // page scroll lock shared by the album view and the viewer
  let locks = 0;
  function lockScroll(d) {
    const was = locks; locks = Math.max(0, locks + d);
    if (!was && locks) { const sb = innerWidth - document.documentElement.clientWidth; document.body.style.overflow = 'hidden'; if (sb > 0) document.body.style.paddingRight = sb + 'px'; }
    if (was && !locks) { document.body.style.overflow = ''; document.body.style.paddingRight = ''; }
  }

  // ---------- music: site background track + per-album tracks ----------
  const sound = (() => {
    const bg = $('#bgAudio'), al = $('#albumAudio'), btn = $('#musicBtn'), abtn = $('#avSound');
    const BG_VOL = 0.35, AL_VOL = 0.6;
    let on = store.get('yaz.sound', true), album = null, waiting = false;
    const fades = new WeakMap();
    function fade(el, to, ms, then) {
      cancelAnimationFrame(fades.get(el)); const from = el.volume, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / ms); try { el.volume = from + (to - from) * k; } catch { } if (k < 1) fades.set(el, requestAnimationFrame(step)); else then?.(); };
      fades.set(el, requestAnimationFrame(step));
    }
    const playing = () => (album && al.src && !al.paused) || (!album && bg.src && !bg.paused);
    function ui() {
      const p = playing();
      [btn, abtn].forEach(b => { b.classList.toggle('playing', p); b.setAttribute('aria-pressed', p); });
      btn.setAttribute('aria-label', p ? 'Mute background music' : 'Play background music');
      abtn.setAttribute('aria-label', p ? 'Mute album music' : 'Play album music');
    }
    function start(el, vol) {
      if (!el.getAttribute('src')) return Promise.reject(new Error('none'));
      el.volume = 0; const pr = el.play(); return (pr || Promise.resolve()).then(() => { fade(el, vol, 900); ui(); });
    }
    function stop(el, keep) { if (el.paused) return; fade(el, 0, keep ? 450 : 350, () => { el.pause(); if (!keep) el.currentTime = 0; ui(); }); }
    // browsers block autoplay with sound until the visitor interacts, so start on the first click / tap / key press anywhere
    function waitForGesture() {
      if (waiting) return; waiting = true;
      const go = (e) => {
        if (e.target?.closest?.('#musicBtn, #avSound')) return;      // the music button handles its own click
        ['pointerdown', 'keydown', 'touchend'].forEach(t => removeEventListener(t, go, true)); waiting = false;
        if (on && !album) start(bg, BG_VOL).catch(() => { });
      };
      ['pointerdown', 'keydown', 'touchend'].forEach(t => addEventListener(t, go, true));
    }
    function setBg(src) {
      if (!src) { btn.hidden = true; return; }
      bg.src = src; bg.loop = true; bg.preload = 'auto'; btn.hidden = false; ui();
      if (on) start(bg, BG_VOL).catch(() => waitForGesture());
    }
    function toggle() {
      if (playing()) { on = false; stop(album ? al : bg, true); }
      else { on = true; (album ? start(al, AL_VOL) : start(bg, BG_VOL)).catch(() => { }); }
      store.set('yaz.sound', on); ui();
    }
    btn.addEventListener('click', toggle); abtn.addEventListener('click', toggle);
    [bg, al].forEach(el => ['play', 'pause', 'ended'].forEach(t => el.addEventListener(t, ui)));
    return {
      setBg, toggle,
      album(a) {     // open (a = album) or close (a = null) an album
        if (a) {
          album = a; stop(bg, true);
          abtn.hidden = !a.music;
          if (a.music) { al.src = asset(a.music); al.loop = true; al.currentTime = 0; if (on) start(al, AL_VOL).catch(() => ui()); }
        } else {
          album = null; stop(al, false); setTimeout(() => { if (!album) al.removeAttribute('src'); }, 400);
          if (on && bg.getAttribute('src')) start(bg, BG_VOL).catch(() => waitForGesture());
        }
        ui();
      },
    };
  })();

  // ---------- viewer: shared-element open/close, tinted backdrop, swipe carousel, pinch/double-tap zoom ----------
  const lb = $('#lb'), stage = $('#lbStage'), track = $('#lbTrack'), textEl = $('#lbText'), tintEl = $('#lbTint'), glowEl = $('#lbGlow');
  const EASE = 'cubic-bezier(.22,.8,.24,1)', GAP = 28;
  let idx = 0, panelI = -1, lastFocus = null, W = 0, offset = 0, pendingK = 0, animTimer = 0, closing = false, flyer = null;
  let ctx = { list: [], grid: null, tint: null };      // what the viewer is showing: the portfolio, or one album (tint = album cover colour)
  const L = () => ctx.list;
  const N = () => L().length, wrap = (i) => ((i % N()) + N()) % N();
  const tileImg = (i) => ctx.grid?.querySelector(`.tile[data-i="${i}"] img`);
  const slides = [0, 1, 2].map(() => { const s = document.createElement('div'); s.className = 'lb-slide'; s.innerHTML = '<img alt="" draggable="false">'; track.appendChild(s); return s; });
  const curImg = () => slides[1].firstElementChild;   // slides = [previous, current, next]

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
    s.dataset.i = j; s.setAttribute('aria-hidden', slot !== 1); im.alt = slot === 1 ? (a.title || a.caption || 'Artwork') : '';
    if (im.getAttribute('src') !== src) {
      im.style.opacity = ''; const t = thumb(a.image);
      im.style.backgroundImage = t !== src ? `url("${t.replace(/"/g, '%22')}")` : '';      // fast preview while the full-resolution file loads
      im.onload = () => { fit(im); im.style.backgroundImage = ''; if (j === panelI) setTint(j); }; im.src = src;
    }
    fit(im);
  }
  function place() { slides.forEach((s, k) => { s.style.transform = `translate3d(${(k - 1) * (W + GAP)}px,0,0)`; }); slides[0].hidden = slides[2].hidden = N() < 2; }
  function setOffset(x, ms = 0) { offset = x; track.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none'; track.style.transform = `translate3d(${x}px,0,0)`; }
  function layout() { W = stage.clientWidth; place(); slides.forEach(s => fit(s.firstElementChild)); }

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
    glowEl.style.backgroundColor = t ? `hsl(${t.h} ${Math.min(80, s + 15)}% 34%)` : 'transparent';
    lb.dataset.tint = t ? `${t.h},${s}` : '';
  }

  // ----- right-hand (desktop) / below-image (mobile) text panel -----
  let panelTimer = 0;
  function setPanel(i, animate) {
    if (i === panelI) return; panelI = i; const a = L()[i];
    $('#lbLike').dataset.art = a.id; $('#lbViews').dataset.art = a.id; countView(a.id);
    const apply = () => {
      $('#lbTitle').textContent = a.title || ''; $('#lbTitle').hidden = !a.title;
      $('#lbCap').textContent = a.caption || ''; $('#lbCap').hidden = !a.caption;
      $('#lbIdx').textContent = `${i + 1} / ${N()}`;
      $('#lbLive').textContent = `Artwork ${i + 1} of ${N()}${a.title ? ': ' + a.title : ''}`;
      paint(a.id); loadCount(a.id); textEl.classList.remove('swap');
    };
    clearTimeout(panelTimer);
    if (animate && !reduce) { textEl.classList.add('swap'); panelTimer = setTimeout(apply, 170); } else apply();
    setTint(i);
  }

  // ----- carousel -----
  function go(k, v = 0) {
    if (N() < 2) k = 0;
    if (animTimer) commit();
    const target = -k * (W + GAP), dist = Math.abs(target - offset);
    pendingK = k; setPanel(wrap(idx + k), true);
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

  // ----- open / close with a shared-element "flight" between the thumbnail and the viewer -----
  function onScreen(el) {
    if (!el) return null; const r = el.getBoundingClientRect(), sc = el.closest('.pf-scroll')?.getBoundingClientRect();
    if (sc && (r.right < sc.left + 20 || r.left > sc.right - 20)) return null;          // hidden sideways inside the portfolio band
    return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? r : null;
  }
  function fly(from, to, src, r0, r1, ms, host = lb) {
    flyer?.remove(); const g = flyer = document.createElement('div'); g.className = 'lb-flyer'; g.innerHTML = `<img alt="" src="${esc(src)}">`; host.appendChild(g);
    const k = (r, rad) => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: rad + 'px' });
    return g.animate([k(from, r0), k(to, r1)], { duration: ms, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'forwards' }).finished.catch(() => { });
  }
  async function open(i, c) {
    if (!lb.hidden || !c?.list.length) return;
    ctx = c; slides.forEach(s => { const im = s.firstElementChild; im.removeAttribute('src'); im.style.backgroundImage = ''; });
    lastFocus = document.activeElement; idx = i; panelI = -1; closing = false;
    lb.hidden = false; lockScroll(1);
    layout(); fill(0, i - 1); fill(1, i); fill(2, i + 1); setOffset(0); setPanel(i, false);
    $('#lbClose').focus({ preventScroll: true });
    const thumb = tileImg(i), r0 = !reduce && onScreen(thumb), im = curImg();
    requestAnimationFrame(() => lb.classList.add('open'));
    if (!r0) return;
    im.style.opacity = '0'; thumb.style.visibility = 'hidden';
    await fly(r0, im.getBoundingClientRect(), thumb.currentSrc || thumb.src, 14, 10, 420);
    try { await im.decode(); } catch { }
    im.style.opacity = ''; thumb.style.visibility = ''; flyer?.remove(); flyer = null;
  }
  async function close() {
    if (lb.hidden || closing) return; closing = true;
    if (animTimer) commit(); if (offset) setOffset(0);
    const im = curImg(); resetZoom(im);
    const card = ctx.grid?.querySelector(`.tile[data-i="${idx}"]`)?.closest('.card, .brick');
    if (card && card.offsetParent) {
      card.classList.add('in', 'done');
      if (card.classList.contains('brick')) { const sc = card.closest('.pf-scroll'); const r = card.getBoundingClientRect(), R = sc.getBoundingClientRect(); if (r.left < R.left || r.right > R.right) { sc.scrollLeft = Math.max(0, card.offsetLeft - (sc.clientWidth - card.offsetWidth) / 2); pf.sync(); } }
      if (!onScreen(card.querySelector('img'))) card.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }
    const thumb = tileImg(idx), r1 = !reduce && onScreen(thumb), r0 = im.getBoundingClientRect();
    lb.classList.remove('open');
    if (r1 && r0.width) {
      thumb.style.visibility = 'hidden'; im.style.opacity = '0';
      await fly(r0, r1, im.currentSrc || im.src, 10, 14, 380);
      thumb.style.visibility = '';
    } else await new Promise(r => setTimeout(r, reduce ? 0 : 320));
    lb.hidden = true; im.style.opacity = ''; flyer?.remove(); flyer = null; lockScroll(-1); closing = false;
    lastFocus?.focus?.({ preventScroll: true });
  }
  $('#lbClose').onclick = close; $('#lbPrev').onclick = () => go(-1); $('#lbNext').onclick = () => go(1);
  $('#lbLike').onclick = () => L()[panelI] && like(L()[panelI].id, $('#lbLike'));
  addEventListener('resize', () => { if (!lb.hidden) { if (animTimer) commit(); layout(); setOffset(0); resetZoom(curImg()); } });
  addEventListener('keydown', e => {
    if (lb.hidden) {                       // album view open (no artwork viewer on top)
      if (av.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeAlbum(); }
      else if (e.key === 'Tab') { const f = [...av.querySelectorAll('button')].filter(x => x.offsetParent); const k = f.indexOf(document.activeElement); if (k === -1 || (e.shiftKey ? k === 0 : k === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0]?.focus(); } }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); return zs(curImg()).s > 1.01 ? resetZoom(curImg(), 240) : close(); }
    if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button')].filter(x => x.offsetParent && getComputedStyle(x).visibility !== 'hidden'); const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === '+' || e.key === '=') { const r = curImg().getBoundingClientRect(); zoomAt(curImg(), zs(curImg()).s * 1.5, r.left + r.width / 2, r.top + r.height / 2, 200); }
    else if (e.key === '-' || e.key === '0') resetZoom(curImg(), 200);
  });

  const portfolioJson = () => json('content/portfolio.json').catch(() => ({ artworks: [] }));
  Promise.all([json('content/site.json').catch(() => ({})), portfolioJson(),
    json('content/albums.json').catch(() => ({ albums: [] })), json('content/thumbs.json').catch(() => ({})),
    json('content/commissions.json').catch(() => ({ tiers: [] }))]).then(([s, g, A, T, C]) => {
    T = T && typeof T === 'object' ? T : {};
    if (T.thumbs || T.sizes) { thumbs = T.thumbs || {}; sizes = T.sizes || {}; } else thumbs = T;     // old manifest = plain { path: thumb }
    const pieces = (list) => (list || []).filter(a => a && a.image).map(a => ({ ...a, id: artId(a.image) }));
    art = pieces(g.artworks);
    albums = (A.albums || []).filter(a => a && (a.name || a.cover)).map(a => ({ ...a, name: a.name || 'Untitled album', items: pieces(a.artworks) }));
    tiers = (C.tiers || []).filter(t => t && (t.name || t.image));
    renderSite(s); pf.render(); renderAlbums(); tierShow.render(tiers);
    sound.setBg(s.music ? asset(s.music) : '');
    const ids = new Set([...art, ...albums.flatMap(a => a.items)].map(a => a.id)); pending().filter(id => ids.has(id)).forEach(send);   // likes that couldn't be sent last time
  });

  // ---------- commissions: auto-advancing slideshow of tiers ----------
  // Every 5 s the next tier comes in: the example image glides in from the right out of a soft blur while the old one
  // drifts left and fades, the tier name rises in letter by letter, then the description, and the price box draws its outline.
  // Pauses on hover, focus or touch; dots, arrows, swipe and ← → work; with reduced motion it never auto-advances.
  const tierShow = (() => {
    const box = $('#tiers'), stage = $('#tiersStage'), dots = $('#tDots'), DUR = 5000;
    let list = [], cur = 0, elapsed = 0, last = 0, raf = 0, hover = false, focus = false, touchHold = 0, hidden = document.hidden;
    const letters = (t) => String(t || '').split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' :
      `<span class="w">${[...w].map(c => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join('');
    function render(t) {
      list = t; box.hidden = !list.length; $('#commWhat').hidden = !list.length;
      stage.innerHTML = list.map((t, k) => `<article class="tier" data-k="${k}" role="group" aria-roledescription="slide" aria-label="${k + 1} of ${list.length}: ${esc(t.name || '')}" aria-hidden="true">
        <div class="tier-media">${t.image ? `<img src="${esc(thumb(t.image))}" alt="${esc(t.name ? 'Example: ' + t.name : 'Example artwork')}" decoding="async" loading="${k ? 'lazy' : 'eager'}" draggable="false">` : ''}</div>
        <div class="tier-text">
          <h3 class="tier-name">${letters(t.name)}</h3>
          ${t.description ? `<p class="tier-desc">${esc(t.description)}</p>` : ''}
          ${t.price ? `<div class="tier-price"><svg aria-hidden="true"><rect rx="14" ry="14" pathLength="1"/></svg><span>${esc(t.price)}</span></div>` : ''}
          ${t.notes ? `<p class="tier-notes">${esc(t.notes)}</p>` : ''}
        </div></article>`).join('');
      stage.querySelectorAll('.tier-name').forEach(h => h.querySelectorAll('.ch').forEach((c, i) => c.style.setProperty('--i', i)));
      dots.innerHTML = list.length > 1 ? list.map((t, k) => `<button type="button" class="t-dot" data-k="${k}" aria-label="Show ${esc(t.name || 'tier ' + (k + 1))}"><i></i></button>`).join('') : '';
      $('#tiersCtrl').hidden = list.length < 2;
      cur = 0; show(0, 0, true); sizeRects();
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }
    function sizeRects() {     // the price outline is an SVG rect sized to its box, so it can "draw" itself in
      stage.querySelectorAll('.tier-price').forEach(p => { const r = p.querySelector('rect'), w = p.offsetWidth, h = p.offsetHeight; if (!w) return;
        r.setAttribute('x', 1.5); r.setAttribute('y', 1.5); r.setAttribute('width', Math.max(0, w - 3)); r.setAttribute('height', Math.max(0, h - 3)); });
    }
    addEventListener('resize', sizeRects); document.fonts?.ready.then(sizeRects);
    function show(k, dir = 1, first = false) {
      if (!list.length) return; k = ((k % list.length) + list.length) % list.length;
      const els = [...stage.children], prev = els[cur], next = els[k];
      if (!first && k === cur) return;
      els.forEach(e => e.classList.remove('leave', 'back'));
      if (prev && prev !== next) { prev.classList.remove('on'); prev.classList.add('leave'); prev.classList.toggle('back', dir < 0); prev.setAttribute('aria-hidden', 'true'); }
      next.classList.toggle('back', dir < 0); void next.offsetWidth; next.classList.add('on'); next.setAttribute('aria-hidden', 'false');
      cur = k; elapsed = 0;
      dots.querySelectorAll('.t-dot').forEach((d, i) => { d.classList.toggle('on', i === k); d.setAttribute('aria-current', i === k ? 'true' : 'false'); d.style.setProperty('--p', 0); });
      sizeRects();
    }
    const paused = () => reduce || hover || focus || touchHold || hidden || list.length < 2;
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
    let px = null;
    stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') px = e.clientX; });
    stage.addEventListener('pointerup', e => { if (px != null && Math.abs(e.clientX - px) > 60) go(e.clientX < px ? 1 : -1); px = null; });
    return { render, show, get cur() { return cur; } };
  })();
})();
