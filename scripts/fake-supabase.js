// Local stand-in for a Supabase project, for tests only.
// Runs the REAL supabase/schema.sql inside PGlite (Postgres in WebAssembly) and
// answers the same HTTP routes the site uses: POST /rest/v1/rpc/<fn> and /auth/v1/token.
// Nothing here talks to the internet.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const PORT = +process.env.FAKE_SUPABASE_PORT || 8091;
const ARTIST = { id: '11111111-2222-4333-8444-555555555555', email: 'aitazouzabdellah@gmail.com', password: 'test-password' };
const STRANGER = { id: '99999999-2222-4333-8444-555555555555', email: 'someone@example.com', password: 'test-password' };

async function boot() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    insert into auth.users values ('${ARTIST.id}', '${ARTIST.email}'), ('${STRANGER.id}', '${STRANGER.email}');
  `);
  await db.exec(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'link-artist-login.sql'), 'utf8'));
  return db;
}

// call an RPC exactly like PostgREST would: as role anon/authenticated, with jwt claims + headers set
async function rpc(db, fn, args, user, ip = '127.0.0.1') {
  const names = Object.keys(args || {});
  const sig = names.map((n, i) => `${n} => $${i + 1}`).join(', ');
  const claims = user ? JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' }) : '';
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', $2, true)`, [claims, JSON.stringify({ 'x-forwarded-for': ip })]);
    await tx.exec(`set local role ${user ? 'authenticated' : 'anon'}`);
    if (!/^[a-z_]+$/.test(fn)) throw new Error('bad fn');
    const r = await tx.query(`select public.${fn}(${sig}) as v`, names.map(n => args[n]));
    return r.rows[0].v;
  });
}

function start(db) {
  const tokens = new Map();
  const send = (res, code, body) => {
    res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'apikey, authorization, content-type, x-client-info', 'access-control-allow-methods': 'POST, GET, OPTIONS' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204);
    let raw = ''; req.on('data', c => raw += c); req.on('end', async () => {
      try {
        if (!req.headers.apikey) return send(res, 401, { message: 'No API key found in request' });
        const url = new URL(req.url, 'http://x'); const body = raw ? JSON.parse(raw) : {};
        if (url.pathname === '/auth/v1/token') {
          let user;
          if (url.searchParams.get('grant_type') === 'password') user = [ARTIST, STRANGER].find(u => u.email === body.email && u.password === body.password);
          else user = tokens.get('r:' + body.refresh_token);
          if (!user) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
          const at = 'fake-access-' + Math.random().toString(36).slice(2), rt = 'fake-refresh-' + Math.random().toString(36).slice(2);
          tokens.set('a:' + at, user); tokens.set('r:' + rt, user);
          return send(res, 200, { access_token: at, refresh_token: rt, expires_in: 3600, token_type: 'bearer', user: { id: user.id, email: user.email } });
        }
        if (url.pathname === '/auth/v1/logout') return send(res, 204);
        const m = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
        if (m && req.method === 'POST') {
          const auth = (req.headers.authorization || '').replace(/^Bearer /, '');
          const user = tokens.get('a:' + auth) || null;
          const v = await rpc(db, m[1], body, user, req.headers['x-test-ip'] || '127.0.0.1');
          return send(res, 200, v === null ? null : v);
        }
        if (url.pathname.startsWith('/rest/v1/')) return send(res, 401, { message: 'permission denied' });
        send(res, 404, { message: 'not found' });
      } catch (e) {
        send(res, 400, { code: 'P0001', message: e.message, hint: e.hint || null });
      }
    });
  });
  return new Promise(r => server.listen(PORT, () => r(server)));
}

module.exports = { boot, rpc, start, ARTIST, STRANGER, PORT };
if (require.main === module) boot().then(start).then(() => console.log('fake supabase on http://localhost:' + PORT));
