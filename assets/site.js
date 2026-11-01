(() => {
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // CMS stores paths like "/images/x.jpg"; make them relative so the site works at user.github.io/yazartsgallery/ AND on a custom domain
  const asset = (p) => !p ? '' : /^(https?:)?\/\//.test(p) ? p : String(p).replace(/^\/+/, '');
  const json = (u) => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  let art = [];

  $('#yr').textContent = new Date().getFullYear();
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  // nav: solid background after the hero, active link, mobile menu
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#menuBtn').addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', o); });
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', false); }));
  const secIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('active', a.dataset.nav === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['home', 'gallery', 'about', 'connect'].forEach(id => secIO.observe(document.getElementById(id)));

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
    if (s.tagline != null) $('#tagline').textContent = s.tagline;
    if (s.heroImage) $('#heroImg').src = asset(s.heroImage);
    $('#aboutText').textContent = s.about || '';
    $('#about').hidden = !s.about;
    const open = s.commissionsOpen !== false;
    $('#commStatus').classList.toggle('closed', !open);
    $('#commStatus b').textContent = open ? 'Commissions open' : 'Commissions closed';
    $('#commText').textContent = (open ? s.commissionText : s.commissionClosedText) || '';
    $('#links').innerHTML = (s.links || []).filter(l => l && l.url).map(l => `
      <li><a href="${esc(l.url)}" target="_blank" rel="noopener me"><span class="ico">${iconFor(l.label || '', l.url)}</span>
        <span><strong>${esc(l.label || handle(l.url))}</strong><small>${esc(handle(l.url))}</small></span>
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a></li>`).join('');
  }

  function renderGrid() {
    const grid = $('#grid');
    grid.innerHTML = art.map((a, i) => {
      const label = a.title || a.caption || `Artwork ${i + 1}`;
      return `<button class="tile fade" style="--d:${(i % 4) * 0.07}s" data-i="${i}" aria-label="Open ${esc(label)}">
        <img src="${esc(asset(a.image))}" alt="${esc(label)}" loading="${i < 8 ? 'eager' : 'lazy'}" decoding="async" onload="this.classList.add('ok')">
        ${a.title ? `<span class="cap">${esc(a.title)}</span>` : ''}</button>`;
    }).join('');
    grid.querySelectorAll('.tile').forEach(t => { observe(t); t.addEventListener('transitionend', () => t.classList.add('done'), { once: true }); });
    grid.querySelectorAll('img').forEach(im => { if (im.complete) im.classList.add('ok'); });
    $('#empty').hidden = art.length > 0;
  }

  // lightbox
  const lb = $('#lb'), img = $('#lbImg'); let idx = 0, lastFocus;
  function show(i) {
    idx = (i + art.length) % art.length; const a = art[idx];
    const apply = () => {
      img.src = asset(a.image); img.alt = a.title || a.caption || 'Artwork';
      $('#lbTitle').textContent = a.title || ''; $('#lbCap').textContent = a.caption || '';
      $('#lbIdx').textContent = `${idx + 1} / ${art.length}`;
      img.onload = () => img.classList.remove('swap'); if (img.complete) img.classList.remove('swap');
    };
    if (!lb.hidden && !reduce) { img.classList.add('swap'); setTimeout(apply, 200); } else apply();
  }
  function open(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('open'))); $('#lbClose').focus({ preventScroll: true }); }
  function close() { lb.classList.remove('open'); setTimeout(() => { lb.hidden = true; document.body.style.overflow = ''; lastFocus?.focus?.({ preventScroll: true }); }, reduce ? 0 : 380); }
  $('#grid').addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) open(+t.dataset.i); });
  $('#lbClose').onclick = close; $('#lbPrev').onclick = () => show(idx - 1); $('#lbNext').onclick = () => show(idx + 1);
  lb.addEventListener('click', e => { if (e.target === lb || e.target.id === 'lbFig') close(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button')]; const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
  });
  let sx = null; lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });

  Promise.all([json('content/site.json').catch(() => ({})), json('content/gallery.json').catch(() => ({ artworks: [] }))]).then(([s, g]) => {
    renderSite(s); art = (g.artworks || []).filter(a => a && a.image); renderGrid();
  });
})();
