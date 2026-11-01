// Visitor side of a private conversation: conversation.html#<secret token>
(() => {
  const Y = window.YAZ, $ = (s) => document.querySelector(s), esc = Y.esc;
  addEventListener('hashchange', () => location.reload());
  const token = decodeURIComponent(location.hash.slice(1)).trim();
  const sub = $('#chatSub'), list = $('#msgs'), form = $('#replyForm'), msg = $('#replyMsg');
  let lastCount = -1, meta = null;
  const bubble = (m) => `<li class="msg ${m.sender}"><div class="who">${m.sender === 'artist' ? '<svg aria-hidden="true"><use href="#palette"/></svg>Yaz' : esc(meta?.name || 'You')}</div>
    <p>${esc(m.body)}</p><time datetime="${esc(m.created_at)}">${esc(Y.ago(m.created_at))}</time></li>`;
  const fail = (t) => { sub.textContent = t; form.hidden = true; list.innerHTML = ''; };

  async function load(quiet) {
    try {
      const t = await Y.rpc('get_thread', { p_token: token }); meta = t;
      sub.innerHTML = (t.kind === 'commission' ? `Commission request${t.commission_type ? ' · ' + esc(t.commission_type) : ''}${t.budget ? ' · ' + esc(t.budget) : ''}` : 'Message') + ` · started ${esc(Y.ago(t.created_at))}`;
      if (t.messages.length !== lastCount) {
        list.innerHTML = t.messages.map(bubble).join('') + (t.messages.every(m => m.sender === 'client') ? '<li class="wait">Yaz will reply here. Come back to this page (or bookmark it) to see the answer.</li>' : '');
        if (lastCount >= 0) list.lastElementChild?.classList.add('new');
        lastCount = t.messages.length; if (quiet) list.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      form.hidden = t.closed; if (t.closed && !$('#closedNote')) list.insertAdjacentHTML('afterend', '<p class="chat-note" id="closedNote">Yaz closed this conversation. Send a new message from the gallery page if you need anything else.</p>');
      Y.threads.add({ token, kind: t.kind, name: t.name, at: t.created_at });
    } catch (e) { if (!quiet) fail(e.code === 'off' ? 'Messages aren\u2019t switched on yet.' : e.message); }
  }

  Y.ready.then(c => {
    if (!c.db) return fail('Messages aren\u2019t switched on yet.');
    if (!/^[a-f0-9]{64}$/.test(token)) return fail('This conversation link looks incomplete. Please copy the whole link.');
    load();
    setInterval(() => { if (!document.hidden) load(true); }, 30000);
    addEventListener('visibilitychange', () => { if (!document.hidden) load(true); });
  });

  $('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(location.href); $('#copyBtn').textContent = 'Link copied'; } catch { prompt('Copy your private link:', location.href); } setTimeout(() => { $('#copyBtn').textContent = 'Copy private link'; }, 1800); };
  form.addEventListener('submit', async e => {
    e.preventDefault(); const body = form.elements.body.value.trim();
    if (form.elements.website.value) return;
    if (!body) { msg.textContent = 'Write a reply first.'; msg.className = 'form-msg err'; return; }
    form.classList.add('busy'); msg.textContent = 'Sending…'; msg.className = 'form-msg';
    try {
      const r = await Y.rpc('client_reply', { p_token: token, p_body: body });
      form.elements.body.value = ''; msg.textContent = 'Sent!'; msg.className = 'form-msg ok';
      Y.notify(`New reply from ${r.name} · yazartsgallery`, { name: r.name, type: r.kind === 'commission' ? 'Reply in a commission request' : 'Reply in a conversation', message: body,
        reply_here: new URL('inbox.html', location.href.split('#')[0]).href, note: 'Reply in your website inbox (link above), not by email.' });
      await load(true);
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg err'; }
    form.classList.remove('busy');
  });
})();
