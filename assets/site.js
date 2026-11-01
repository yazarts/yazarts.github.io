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
    commOpen = open;
    if (s.contactIntro) $('#contactIntro').textContent = s.contactIntro;
    $('#kindCommission').hidden = !open; if (!open) form.elements.kind.value = 'message';
    const opts = (l, d) => (Array.isArray(l) && l.length ? l : d).map(o => `<option>${esc(o)}</option>`).join('');
    $('#commType').innerHTML = opts(s.commissionTypes, ['Portrait', 'Character design', 'Illustration', 'Something else']);
    $('#budget').innerHTML = opts(s.budgetOptions, ['Not sure yet']); setKind();
    $('#links').innerHTML = (s.links || []).filter(l => l && l.url).map(l => `
      <li><a href="${esc(l.url)}" target="_blank" rel="noopener me"><span class="ico">${iconFor(l.label || '', l.url)}</span>
        <span><strong>${esc(l.label || handle(l.url))}</strong><small>${esc(handle(l.url))}</small></span>
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a></li>`).join('');
  }

  // ---------- gallery grid (with like / comment / view counts under each piece) ----------
  const Y = window.YAZ; let stats = {}, social = false;
  const liked = () => Y.LS.get('yaz.liked', {});
  const metaHTML = (id) => `<div class="meta social-only" data-art="${esc(id)}">
      <button class="m-like" type="button" aria-pressed="false" aria-label="Like"><svg><use href="#i-heart"/></svg><span class="n">0</span></button>
      <button class="m-com" type="button" aria-label="Comments"><svg><use href="#i-chat"/></svg><span class="n">0</span></button>
      <span class="m-view" title="Views"><svg><use href="#i-eye"/></svg><span class="n">0</span><span class="sr"> views</span></span></div>`;
  function renderGrid() {
    const grid = $('#grid');
    grid.innerHTML = art.map((a, i) => {
      const label = a.title || a.caption || `Artwork ${i + 1}`;
      return `<div class="card fade" style="--d:${(i % 4) * 0.07}s"><button class="tile" data-i="${i}" aria-label="Open ${esc(label)}">
        <img src="${esc(asset(a.image))}" alt="${esc(label)}" loading="${i < 8 ? 'eager' : 'lazy'}" decoding="async" onload="this.classList.add('ok')">
        ${a.title ? `<span class="cap">${esc(a.title)}</span>` : ''}</button>${metaHTML(a.id)}</div>`;
    }).join('');
    grid.querySelectorAll('.card').forEach(t => { observe(t); t.addEventListener('transitionend', () => t.classList.add('done'), { once: true }); });
    grid.querySelectorAll('img').forEach(im => { if (im.complete) im.classList.add('ok'); });
    $('#empty').hidden = art.length > 0;
    paintCounts();
  }
  function paintCounts(only) {
    const L = liked();
    document.querySelectorAll('.meta[data-art]').forEach(m => {
      const id = m.dataset.art; if (only && id !== only) return; const st = stats[id] || {};
      const [l, c, v] = m.querySelectorAll('.n'); l.textContent = Y.fmt(st.likes); c.textContent = Y.fmt(st.comments); v.textContent = Y.fmt(st.views);
      const b = m.querySelector('.m-like'); b.setAttribute('aria-pressed', !!L[id]); b.setAttribute('aria-label', (L[id] ? 'Liked' : 'Like') + ` (${st.likes || 0})`);
      m.querySelector('.m-com').setAttribute('aria-label', `Comments (${st.comments || 0})`);
    });
    if (!lb.hidden && art[idx]) { const st = stats[art[idx].id] || {}, on = !!L[art[idx].id];
      $('#lbLike .n').textContent = Y.fmt(st.likes); $('#lbLike').setAttribute('aria-pressed', on); $('#lbComN').textContent = Y.fmt(st.comments); $('#lbViewN').textContent = Y.fmt(st.views); }
  }
  const pop = (b) => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
  async function like(id, btn) {
    pop(btn); const L = liked(); if (L[id]) return;   // one like per visitor
    L[id] = 1; Y.LS.set('yaz.liked', L); const st = stats[id] = stats[id] || { likes: 0, views: 0, comments: 0 }; st.likes++;
    paintCounts(id);
    try { const r = await Y.rpc('like_art', { p_art: id, p_visitor: Y.visitorId() }); st.likes = r.likes; } catch { /* keep the optimistic count */ }
    paintCounts(id);
  }
  $('#grid').addEventListener('click', e => {
    const t = e.target.closest('.tile'); if (t) return open(+t.dataset.i);
    const m = e.target.closest('.meta'); if (!m) return; const i = art.findIndex(a => a.id === m.dataset.art);
    if (e.target.closest('.m-like')) like(m.dataset.art, e.target.closest('.m-like'));
    else if (e.target.closest('.m-com')) { open(i); setTimeout(() => $('#cform [name=body]').focus(), reduce ? 50 : 450); }
  });

  // ---------- lightbox ----------
  const lb = $('#lb'), img = $('#lbImg'); let idx = 0, lastFocus;
  function show(i) {
    idx = (i + art.length) % art.length; const a = art[idx];
    const apply = () => {
      img.src = asset(a.image); img.alt = a.title || a.caption || 'Artwork';
      $('#lbTitle').textContent = a.title || ''; $('#lbCap').textContent = a.caption || '';
      $('#lbIdx').textContent = `${idx + 1} / ${art.length}`;
      img.onload = () => img.classList.remove('swap'); if (img.complete) img.classList.remove('swap');
      if (social) { $('#cMsg').textContent = ''; paintCounts(); loadComments(a.id); countView(a.id); }
    };
    if (!lb.hidden && !reduce) { img.classList.add('swap'); setTimeout(apply, 200); } else apply();
  }
  function open(i) { lastFocus = document.activeElement; lb.hidden = false; show(i); document.body.style.overflow = 'hidden'; lb.scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('open'))); $('#lbClose').focus({ preventScroll: true }); }
  function close() { lb.classList.remove('open'); setTimeout(() => { lb.hidden = true; document.body.style.overflow = ''; lastFocus?.focus?.({ preventScroll: true }); }, reduce ? 0 : 380); }
  $('#lbClose').onclick = close; $('#lbPrev').onclick = () => show(idx - 1); $('#lbNext').onclick = () => show(idx + 1);
  $('#lbLike').onclick = () => art[idx] && like(art[idx].id, $('#lbLike'));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.id === 'lbFig' || e.target.classList.contains('lb-media')) close(); });
  const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') return close();
    if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button, input:not([tabindex="-1"]), textarea')].filter(x => x.offsetParent); const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); return; }
    if (typing()) return;
    if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
  });
  let sx = null; lb.addEventListener('touchstart', e => { sx = e.target.closest('.lb-social') ? null : e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });

  // views: counted once per artwork per browser session, when it is opened in the viewer
  function countView(id) {
    let seen = {}; try { seen = JSON.parse(sessionStorage.getItem('yaz.seen') || '{}'); } catch { }
    if (seen[id]) return; seen[id] = 1; try { sessionStorage.setItem('yaz.seen', JSON.stringify(seen)); } catch { }
    const st = stats[id] = stats[id] || { likes: 0, views: 0, comments: 0 }; st.views++; paintCounts(id);
    Y.rpc('record_view', { p_art: id }).then(r => { st.views = r.views; paintCounts(id); }).catch(() => { });
  }
  // comments
  let cReq = 0;
  const commentHTML = (c) => `<li><div class="c-top"><b>${esc(c.name)}</b><time datetime="${esc(c.created_at)}">${esc(Y.ago(c.created_at))}</time></div><p>${esc(c.body)}</p></li>`;
  async function loadComments(id) {
    const n = ++cReq, ul = $('#comments'); ul.innerHTML = '<li class="c-empty">Loading comments…</li>';
    try { const list = await Y.rpc('get_comments', { p_art: id }); if (n !== cReq) return;
      ul.innerHTML = list.length ? list.map(commentHTML).join('') : '<li class="c-empty">No comments yet. Be the first!</li>';
      const st = stats[id] = stats[id] || { likes: 0, views: 0, comments: 0 }; if (list.length < 100) st.comments = list.length; paintCounts(id);
    } catch { if (n === cReq) ul.innerHTML = '<li class="c-empty">Comments couldn\u2019t load right now.</li>'; }
  }
  const cform = $('#cform');
  cform.elements.name.value = Y.LS.get('yaz.name', '');
  cform.addEventListener('submit', async e => {
    e.preventDefault(); const f = cform.elements, msg = $('#cMsg'), a = art[idx]; if (!a) return;
    const name = f.name.value.trim(), body = f.body.value.trim();
    if (f.website.value) { f.body.value = ''; return; }                       // honeypot: bots fill hidden fields
    if (!name || !body) { msg.textContent = 'Add your name and a comment.'; msg.className = 'err'; return; }
    if (Date.now() - Y.LS.get('yaz.lastComment', 0) < 20000) { msg.textContent = 'Please wait a few seconds before posting again.'; msg.className = 'err'; return; }
    cform.classList.add('busy'); msg.textContent = 'Posting…'; msg.className = '';
    try {
      const c = await Y.rpc('add_comment', { p_art: a.id, p_name: name, p_body: body });
      Y.LS.set('yaz.lastComment', Date.now()); Y.LS.set('yaz.name', name); f.body.value = ''; msg.textContent = 'Thanks for your comment!'; msg.className = 'ok';
      const ul = $('#comments'); ul.querySelector('.c-empty')?.remove(); ul.insertAdjacentHTML('afterbegin', commentHTML(c)); ul.firstElementChild.classList.add('new');
      const st = stats[a.id] = stats[a.id] || { likes: 0, views: 0, comments: 0 }; st.comments++; paintCounts(a.id);
    } catch (err) { msg.textContent = err.message; msg.className = 'err'; }
    cform.classList.remove('busy');
  });

  // ---------- contact form → private on-site conversation ----------
  const form = $('#contactForm'), fmsg = $('#formMsg'); const shownAt = Date.now(); let commOpen = true;
  function setKind() { const c = form.elements.kind.value === 'commission'; $('#commFields').hidden = !c; $('#msgLabel').textContent = c ? 'Describe your idea' : 'Message';
    form.elements.message.placeholder = c ? 'What would you like? Size, style, deadline, reference links…' : 'Hi Yaz! …'; }
  form.addEventListener('change', e => { if (e.target.name === 'kind') setKind(); });
  const threadUrl = (token) => new URL('conversation.html#' + token, location.href.split('#')[0]).href;
  const inboxUrl = () => new URL('inbox.html', location.href.split('#')[0]).href;
  form.addEventListener('submit', async e => {
    e.preventDefault(); const f = form.elements; const v = (k) => (f[k]?.value || '').trim();
    const data = { kind: commOpen && v('kind') === 'commission' ? 'commission' : 'message', name: v('name'), email: v('email'), commission_type: v('commission_type'), budget: v('budget'), message: v('message') };
    const bad = (m, el) => { fmsg.textContent = m; fmsg.className = 'form-msg err'; el?.focus(); };
    if (!data.name) return bad('Please tell me your name.', f.name);
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return bad('That email address doesn\u2019t look right.', f.email);
    if (!data.message) return bad(data.kind === 'commission' ? 'Please describe your idea.' : 'Please write a message.', f.message);
    if (v('website') || Date.now() - shownAt < 2500) { form.reset(); setKind(); fmsg.textContent = 'Thanks!'; fmsg.className = 'form-msg ok'; return; } // looks like a bot
    const c = await Y.ready;
    if (!c.db && !c.web3formsKey) return bad('The message form isn\u2019t switched on yet. Please message me on Instagram for now.');
    form.classList.add('busy'); $('#sendBtn').disabled = true; fmsg.textContent = 'Sending…'; fmsg.className = 'form-msg';
    const label = data.kind === 'commission' ? 'commission request' : 'message';
    const details = { name: data.name, email: data.email || '(not given)', type: data.kind === 'commission' ? `Commission: ${data.commission_type || '-'} · budget ${data.budget || '-'}` : 'Message', message: data.message };
    try {
      if (c.db) {
        const r = await Y.rpc('start_thread', { p_name: data.name, p_email: data.email || null, p_kind: data.kind, p_commission_type: data.commission_type || null, p_budget: data.budget || null, p_message: data.message });
        Y.threads.add({ token: r.token, kind: data.kind, name: data.name, at: new Date().toISOString() });
        Y.notify(`New ${label} from ${data.name} · yazartsgallery`, { ...details, reply_here: inboxUrl(), note: 'Reply in your website inbox (link above), not by email.' });
        $('#threadLink').value = threadUrl(r.token); $('#openThread').href = threadUrl(r.token);
        form.hidden = true; $('#sent').hidden = false; $('#sent').focus({ preventScroll: true }); fmsg.textContent = ''; renderMine();
      } else {
        // fallback while only the email service is set up: the whole message goes by email (reply-to = the visitor)
        const ok = await Y.notify(`New ${label} from ${data.name} · yazartsgallery`, { ...details, ...(data.email ? { replyto: data.email } : {}) });
        if (!ok) throw new Error('Your message couldn\u2019t be sent. Please try again, or message me on Instagram.');
        fmsg.textContent = 'Message sent, thank you! I\u2019ll get back to you soon.'; fmsg.className = 'form-msg ok';
      }
      form.reset(); setKind();
    } catch (err) { bad(err.message); }
    form.classList.remove('busy'); $('#sendBtn').disabled = false;
  });
  $('#copyLink').onclick = async () => { const i = $('#threadLink'); i.select(); try { await navigator.clipboard.writeText(i.value); } catch { document.execCommand?.('copy'); } $('#copyLink').textContent = 'Copied'; setTimeout(() => { $('#copyLink').textContent = 'Copy'; }, 1800); };
  $('#newMsg').onclick = () => { $('#sent').hidden = true; form.hidden = false; fmsg.textContent = ''; form.elements.name.focus(); };
  async function renderMine() {
    const list = Y.threads.list(); if (!list.length || !social) return; $('#mine').hidden = false;
    const ul = $('#mineList');
    const draw = (st = []) => { ul.innerHTML = list.map((t, i) => { const s = st.find(x => x.i === i);
      return `<li><a href="${esc(threadUrl(t.token))}"><span>${t.kind === 'commission' ? 'Commission request' : 'Message'} <small>· ${esc(Y.ago(s?.updated_at || t.at))}</small></span>${s?.client_unread ? '<b class="badge">New reply</b>' : s?.last_sender === 'artist' ? '<b class="badge soft">Replied</b>' : ''}</a></li>`; }).join(''); };
    draw(); try { draw(await Y.rpc('my_threads', { p_tokens: list.map(t => t.token) })); } catch { }
  }

  Promise.all([json('content/site.json').catch(() => ({})), json('content/gallery.json').catch(() => ({ artworks: [] })), Y.ready]).then(([s, g, c]) => {
    art = (g.artworks || []).filter(a => a && a.image).map(a => ({ ...a, id: Y.artId(a.image) }));
    social = c.db; document.body.classList.toggle('social-on', social);
    renderSite(s); renderGrid(); renderMine();
    if (social) Y.rpc('get_stats').then(r => { stats = r || {}; paintCounts(); }).catch(() => { });
  });
})();
