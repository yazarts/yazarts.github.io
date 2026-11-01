// Artist inbox: inbox.html (Supabase Auth login; only the account in artist_accounts can read anything)
(() => {
  const Y = window.YAZ, $ = (s) => document.querySelector(s), esc = Y.esc;
  let threads = [], current = null, token = null, comments = [], gallery = [];
  const show = (id) => ['#login', '#inbox', '#offNote'].forEach(s => { $(s).hidden = s !== id; });
  const call = async (fn, args) => {
    token = await Y.auth.token(); if (!token) { show('#login'); throw new Error('signed out'); }
    try { return await Y.rpc(fn, args, token); }
    catch (e) { if (e.code === 'auth' || e.code === 'not_artist') { await Y.auth.signOut(); show('#login'); $('#loginMsg').textContent = e.code === 'not_artist' ? e.message : 'Please sign in again.'; $('#loginMsg').className = 'form-msg err'; } throw e; }
  };

  Y.ready.then(async c => {
    if (!c.db) return show('#offNote');
    fetch('content/gallery.json', { cache: 'no-cache' }).then(r => r.json()).then(g => { gallery = (g.artworks || []).map(a => ({ ...a, id: Y.artId(a.image) })); }).catch(() => { });
    if (await Y.auth.token()) start(); else show('#login');
  });

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target.elements, m = $('#loginMsg');
    m.textContent = 'Signing in…'; m.className = 'form-msg'; e.target.classList.add('busy');
    try { await Y.auth.signIn(f.email.value.trim(), f.password.value); f.password.value = ''; m.textContent = ''; await start(); }
    catch (err) { m.textContent = err.message; m.className = 'form-msg err'; }
    e.target.classList.remove('busy');
  });
  $('#signOut').onclick = async () => { await Y.auth.signOut(); current = null; show('#login'); };

  async function start() {
    try { await loadThreads(); } catch { return; }
    show('#inbox'); $('#whoEmail').textContent = Y.auth.session()?.email || '';
    if (!start.timer) start.timer = setInterval(() => { if (!document.hidden && !$('#inbox').hidden) loadThreads().catch(() => { }); }, 45000);
  }

  async function loadThreads() {
    threads = await call('artist_inbox');
    const n = threads.filter(t => t.artist_unread).length; $('#unreadN').hidden = !n; $('#unreadN').textContent = n;
    document.title = (n ? `(${n}) ` : '') + 'Inbox · yazartsgallery';
    $('#threads').innerHTML = threads.length ? threads.map(t => `<li><button class="th ${t.artist_unread ? 'unread' : ''} ${current === t.id ? 'active' : ''}" data-id="${esc(t.id)}">
        <span class="th-top"><b>${esc(t.name)}</b><time>${esc(Y.ago(t.updated_at))}</time></span>
        <span class="th-tags">${t.kind === 'commission' ? '<i class="tag">Commission</i>' : '<i class="tag soft">Message</i>'}${t.closed ? '<i class="tag mute">Closed</i>' : ''}${t.last_sender === 'artist' ? '<i class="tag mute">You replied</i>' : ''}</span>
        <span class="th-prev">${esc(t.preview || '')}</span></button></li>`).join('')
      : '<li class="empty-view">No messages yet. New messages and commission requests will show up here.</li>';
  }
  $('#threads').addEventListener('click', e => { const b = e.target.closest('.th'); if (b) openThread(b.dataset.id); });

  async function openThread(id) {
    current = id; document.querySelectorAll('.th').forEach(b => b.classList.toggle('active', b.dataset.id === id));
    const v = $('#threadView'); v.classList.add('busy');
    let t; try { t = await call('artist_thread', { p_id: id }); } catch (e) { v.classList.remove('busy'); return; }
    v.classList.remove('busy'); document.body.classList.add('reading');
    v.innerHTML = `<div class="tv-head"><button class="link-btn tv-back" type="button">← All messages</button>
        <h2>${esc(t.name)}</h2>
        <p class="chat-sub">${t.kind === 'commission' ? `Commission request · ${esc(t.commission_type || '-')} · budget ${esc(t.budget || '-')}` : 'Message'} · ${esc(new Date(t.created_at).toLocaleString())}</p>
        <p class="chat-sub">${t.email ? `Email: <a href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : 'No email given'}</p>
        <div class="tv-actions"><button class="btn ghost small" data-act="close">${t.closed ? 'Reopen' : 'Close conversation'}</button><button class="btn ghost small danger" data-act="delete">Delete</button></div></div>
      <ol class="msgs">${t.messages.map(m => `<li class="msg ${m.sender === 'artist' ? 'client' : 'artist'}"><div class="who">${m.sender === 'artist' ? 'You' : esc(t.name)}</div><p>${esc(m.body)}</p><time>${esc(Y.ago(m.created_at))}</time></li>`).join('')}</ol>
      <form class="reply" id="artistReply" novalidate><label class="sr" for="aBody">Reply</label><textarea id="aBody" name="body" rows="3" maxlength="4000" placeholder="Reply to ${esc(t.name)}… (they see it on their private conversation page)"></textarea>
        <div class="form-foot"><button class="btn" type="submit">Send reply</button><p class="form-msg" id="aMsg" role="status"></p></div></form>`;
    v.querySelector('.msgs').lastElementChild?.scrollIntoView({ block: 'nearest' });
    v.querySelector('.tv-back').onclick = () => { document.body.classList.remove('reading'); };
    v.querySelector('[data-act=close]').onclick = async () => { await call('artist_set_closed', { p_id: id, p_closed: !t.closed }).catch(() => { }); openThread(id); loadThreads().catch(() => { }); };
    v.querySelector('[data-act=delete]').onclick = async () => { if (!confirm(`Delete the conversation with ${t.name}? This can't be undone.`)) return; await call('artist_delete_thread', { p_id: id }).catch(() => { }); current = null; v.innerHTML = '<p class="empty-view">Conversation deleted.</p>'; document.body.classList.remove('reading'); loadThreads().catch(() => { }); };
    v.querySelector('#artistReply').addEventListener('submit', async e => {
      e.preventDefault(); const body = e.target.elements.body.value.trim(), m = $('#aMsg'); if (!body) return;
      e.target.classList.add('busy'); m.textContent = 'Sending…';
      try { await call('artist_reply', { p_id: id, p_body: body }); await openThread(id); loadThreads().catch(() => { }); }
      catch (err) { m.textContent = err.message; m.className = 'form-msg err'; e.target.classList.remove('busy'); }
    });
    loadThreads().catch(() => { });
  }

  // comment moderation
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
    $('#tabMessages').hidden = b.dataset.tab !== 'messages'; $('#tabComments').hidden = b.dataset.tab !== 'comments';
    if (b.dataset.tab === 'comments') loadComments();
  });
  async function loadComments() {
    try { comments = await call('artist_comments'); } catch { return; }
    const art = (id) => gallery.find(a => a.id === id);
    $('#modList').innerHTML = comments.length ? comments.map(c => { const a = art(c.art_id);
      return `<li>${a ? `<img src="${esc(String(a.image).replace(/^\/+/, ''))}" alt="">` : '<span class="noimg"></span>'}<div><div class="c-top"><b>${esc(c.name)}</b> <small>on ${esc(a?.title || c.art_id)} · ${esc(Y.ago(c.created_at))}</small></div><p>${esc(c.body)}</p></div>
        <button class="btn ghost small danger" data-id="${c.id}">Delete</button></li>`; }).join('') : '<li class="empty-view">No comments yet.</li>';
  }
  $('#modList').addEventListener('click', async e => { const b = e.target.closest('[data-id]'); if (!b || !confirm('Delete this comment?')) return;
    await call('artist_delete_comment', { p_id: +b.dataset.id }).catch(() => { }); loadComments(); });
})();
