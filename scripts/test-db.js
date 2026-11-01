// Security / behaviour tests for supabase/schema.sql, run against PGlite (no network).
const assert = require('assert');
const { boot, rpc, ARTIST, STRANGER } = require('./fake-supabase');
const fails = async (p, re) => { try { await p; } catch (e) { if (re && !re.test(e.message)) throw new Error('wrong error: ' + e.message); return; } throw new Error('expected failure'); };

(async () => {
  const db = await boot();
  const asAnon = async (sql) => db.transaction(async tx => { await tx.exec('set local role anon'); return tx.query(sql); });
  // direct table access is blocked for visitors
  for (const t of ['art_stats', 'art_likes', 'art_comments', 'threads', 'messages', 'artist_accounts'])
    await fails(asAnon(`select * from public.${t}`), /permission denied/);
  await fails(asAnon(`insert into public.art_comments (art_id,name,body) values ('a','x','y')`), /permission denied/);
  await fails(asAnon(`delete from public.art_comments`), /permission denied/);
  await fails(asAnon(`select public._rate('x',1,'1 hour')`), /permission denied/);

  // likes: one per visitor
  const v1 = '0e0e0e0e-1111-4111-8111-111111111111', v2 = '0e0e0e0e-2222-4222-8222-222222222222';
  assert.equal((await rpc(db, 'like_art', { p_art: 'placeholder-1', p_visitor: v1 })).likes, 1);
  assert.equal((await rpc(db, 'like_art', { p_art: 'placeholder-1', p_visitor: v1 })).likes, 1);
  assert.equal((await rpc(db, 'like_art', { p_art: 'placeholder-1', p_visitor: v2 })).likes, 2);
  await fails(rpc(db, 'like_art', { p_art: '../evil', p_visitor: v1 }), /bad_artwork/);
  // views
  await rpc(db, 'record_view', { p_art: 'placeholder-1' });
  assert.equal((await rpc(db, 'record_view', { p_art: 'placeholder-1' })).views, 2);
  // comments + length + rate limit
  await rpc(db, 'add_comment', { p_art: 'placeholder-1', p_name: 'Sam', p_body: 'Love the colours!' });
  const long = await rpc(db, 'add_comment', { p_art: 'placeholder-1', p_name: 'x'.repeat(99), p_body: 'y'.repeat(900) });
  assert.equal(long.name.length, 40); assert.equal(long.body.length, 500);
  await fails(rpc(db, 'add_comment', { p_art: 'placeholder-1', p_name: ' ', p_body: 'hi' }), /empty/);
  for (let i = 0; i < 3; i++) await rpc(db, 'add_comment', { p_art: 'placeholder-2', p_name: 'B' + i, p_body: 'c' + i });
  await fails(rpc(db, 'add_comment', { p_art: 'placeholder-2', p_name: 'Spam', p_body: 'spam' }), /rate_limited/);
  await rpc(db, 'add_comment', { p_art: 'placeholder-2', p_name: 'Other', p_body: 'from another IP' }, null, '10.0.0.2');
  const stats = await rpc(db, 'get_stats', {});
  assert.deepEqual(stats['placeholder-1'], { likes: 2, views: 2, comments: 2 });
  assert.equal((await rpc(db, 'get_comments', { p_art: 'placeholder-2' })).length, 4);
  // visitors cannot moderate
  await fails(rpc(db, 'artist_delete_comment', { p_id: 1 }), /permission denied/);
  await fails(rpc(db, 'artist_inbox', {}, STRANGER), /not_artist/);

  // conversations
  const { token } = await rpc(db, 'start_thread', { p_name: 'Mina', p_email: 'mina@example.com', p_kind: 'commission', p_commission_type: 'Portrait', p_budget: '$50–100', p_message: 'Hi! Could you paint my cat?' }, null, '10.0.0.3');
  assert.equal(token.length, 64);
  await fails(rpc(db, 'start_thread', { p_name: 'X', p_email: 'not-an-email', p_kind: 'message', p_commission_type: null, p_budget: null, p_message: 'hi' }, null, '10.0.0.4'), /bad_email/);
  await fails(rpc(db, 'get_thread', { p_token: token.slice(0, 63) + '0' }), /not_found/);
  let t = await rpc(db, 'get_thread', { p_token: token });
  assert.equal(t.messages.length, 1); assert.equal(t.kind, 'commission'); assert.ok(!('email' in t));
  await fails(rpc(db, 'artist_reply', { p_id: '00000000-0000-4000-8000-000000000000', p_body: 'x' }), /permission denied/);
  await fails(rpc(db, 'artist_inbox', {}), /permission denied/);
  const inbox = await rpc(db, 'artist_inbox', {}, ARTIST);
  assert.equal(inbox.length, 1); assert.equal(inbox[0].artist_unread, true); assert.equal(inbox[0].email, 'mina@example.com');
  const full = await rpc(db, 'artist_thread', { p_id: inbox[0].id }, ARTIST);
  assert.equal(full.messages[0].body, 'Hi! Could you paint my cat?');
  await rpc(db, 'artist_reply', { p_id: inbox[0].id, p_body: 'Yes! Send me a photo.' }, ARTIST);
  let mine = await rpc(db, 'my_threads', { p_tokens: [token, 'nope'] });
  assert.equal(mine.length, 1); assert.equal(mine[0].client_unread, true); assert.equal(mine[0].i, 0);
  t = await rpc(db, 'get_thread', { p_token: token });
  assert.equal(t.messages[1].sender, 'artist');
  mine = await rpc(db, 'my_threads', { p_tokens: [token] }); assert.equal(mine[0].client_unread, false);
  await rpc(db, 'client_reply', { p_token: token, p_body: 'Here it is!' });
  assert.equal((await rpc(db, 'artist_inbox', {}, ARTIST))[0].artist_unread, true);
  await rpc(db, 'artist_set_closed', { p_id: inbox[0].id, p_closed: true }, ARTIST);
  await fails(rpc(db, 'client_reply', { p_token: token, p_body: 'more' }), /closed/);
  // moderation
  const cs = await rpc(db, 'artist_comments', {}, ARTIST);
  await rpc(db, 'artist_delete_comment', { p_id: cs[0].id }, ARTIST);
  assert.equal((await rpc(db, 'artist_comments', {}, ARTIST)).length, cs.length - 1);
  await rpc(db, 'artist_delete_thread', { p_id: inbox[0].id }, ARTIST);
  await fails(rpc(db, 'get_thread', { p_token: token }), /not_found/);
  // thread rate limit
  for (let i = 0; i < 4; i++) await rpc(db, 'start_thread', { p_name: 'R', p_email: null, p_kind: 'message', p_commission_type: null, p_budget: null, p_message: 'm' }, null, '10.0.0.9');
  await fails(rpc(db, 'start_thread', { p_name: 'R', p_email: null, p_kind: 'message', p_commission_type: null, p_budget: null, p_message: 'm' }, null, '10.0.0.9'), /rate_limited/);
  console.log('DB tests passed');
})().catch(e => { console.error('DB TEST FAILED:', e); process.exit(1); });
