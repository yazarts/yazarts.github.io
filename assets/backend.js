// Shared helpers for the free backend:
//   * Supabase (free plan): likes, views, comments, private conversations, artist login
//   * Web3Forms (free plan): the "you have a new message" email to the artist
// Keys live in content/integrations.json (editable in Pages CMS → Integrations).
// If they are empty, everything that needs them quietly switches itself off.
(() => {
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { } },
  };
  const cfgUrl = (document.querySelector('meta[name="yaz-root"]')?.content || '') + 'content/integrations.json';
  const ready = fetch(cfgUrl, { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(c => {
    const url = String(c.supabaseUrl || '').trim().replace(/\/+$/, ''), key = String(c.supabaseKey || '').trim();
    return { supabaseUrl: url, supabaseKey: key, web3formsKey: String(c.web3formsAccessKey || '').trim(), db: /^https:\/\/|^http:\/\/localhost/.test(url) && key.length > 20 };
  });
  let cfg = { db: false };
  ready.then(c => { cfg = c; });

  class ApiError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
  const FRIENDLY = {
    rate_limited: 'You are going a little fast. Please wait a few minutes and try again.',
    empty: 'Please fill in the required fields.', bad_email: 'That email address doesn\u2019t look right.',
    not_found: 'This conversation link doesn\u2019t exist (or was deleted).', closed: 'This conversation was closed by Yaz.',
    not_artist: 'This login is not allowed to open the inbox.', too_long: 'This conversation is very long. Please start a new one.',
  };

  async function rpc(fn, args = {}, token) {
    const c = await ready; if (!c.db) throw new ApiError('Not set up yet', 'off');
    const h = { apikey: c.supabaseKey, 'content-type': 'application/json' };
    if (token) h.authorization = 'Bearer ' + token; else if (c.supabaseKey.startsWith('eyJ')) h.authorization = 'Bearer ' + c.supabaseKey; // legacy anon key
    let r;
    try { r = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify(args) }); }
    catch { throw new ApiError('Can\u2019t reach the server. Check your connection and try again.', 'network'); }
    const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { }
    if (!r.ok) {
      const m = (data && (data.message || data.error_description || data.msg)) || '';
      const code = Object.keys(FRIENDLY).find(k => m.includes(k)) || (r.status === 401 ? 'auth' : 'error');
      throw new ApiError(FRIENDLY[code] || 'Something went wrong. Please try again in a moment.', code);
    }
    return data;
  }

  // Artist login (Supabase Auth, email + password). Session kept in this browser only.
  const AUTH_KEY = 'yaz.artistSession';
  async function authCall(path, body, token) {
    const c = await ready; if (!c.db) throw new ApiError('Not set up yet', 'off');
    const h = { apikey: c.supabaseKey, 'content-type': 'application/json' }; if (token) h.authorization = 'Bearer ' + token;
    const r = await fetch(`${c.supabaseUrl}/auth/v1/${path}`, { method: 'POST', headers: h, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (!r) throw new ApiError('Can\u2019t reach the server.', 'network');
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(/invalid/i.test(d.error_description || d.msg || d.message || '') ? 'Wrong email or password.' : 'Sign-in failed. Please try again.', 'auth');
    return d;
  }
  const saveSession = (d) => { const s = { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, email: d.user?.email }; LS.set(AUTH_KEY, s); return s; };
  const auth = {
    session: () => LS.get(AUTH_KEY, null),
    async signIn(email, password) { return saveSession(await authCall('token?grant_type=password', { email, password })); },
    async token() {
      let s = LS.get(AUTH_KEY, null); if (!s) return null;
      if (Date.now() > s.exp - 60000) { try { s = saveSession(await authCall('token?grant_type=refresh_token', { refresh_token: s.refresh })); } catch { LS.del(AUTH_KEY); return null; } }
      return s.access;
    },
    async signOut() { const s = LS.get(AUTH_KEY, null); LS.del(AUTH_KEY); if (s) authCall('logout', null, s.access).catch(() => { }); },
  };

  // Email notification to the artist (Web3Forms sends it to the address the access key was created with).
  async function notify(subject, fields) {
    const c = await ready; if (!c.web3formsKey) return false;
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ access_key: c.web3formsKey, subject, from_name: 'yazartsgallery website', botcheck: false, ...fields }) });
      const d = await r.json().catch(() => ({})); return !!d.success;
    } catch { return false; }
  }

  const visitorId = () => { let v = LS.get('yaz.visitor', null); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16))); LS.set('yaz.visitor', v); } return v; };
  // stable id for an artwork = its image file name ("/images/artworks/My Cat.png" → "my-cat"), so reordering keeps the counts
  const artId = (image) => String(image || '').split('/').pop().replace(/\.[a-z0-9]+$/i, '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'art';
  const threads = { list: () => LS.get('yaz.threads', []), add(t) { const l = threads.list().filter(x => x.token !== t.token); l.unshift(t); LS.set('yaz.threads', l.slice(0, 20)); } };
  const ago = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago'; return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = (n) => n >= 10000 ? (n / 1000).toFixed(0) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n || 0);

  window.YAZ = { ready, get cfg() { return cfg; }, rpc, auth, notify, visitorId, artId, threads, ago, esc, fmt, LS, ApiError };
})();
