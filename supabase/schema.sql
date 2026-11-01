-- =====================================================================
-- yazartsgallery backend (Supabase free plan)
-- Likes, views, comments, on-site messages / commission requests.
--
-- HOW TO USE: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. It is safe to run again later (it only creates what
-- is missing and replaces the functions).
--
-- Security model
--   * Every table has Row Level Security ON and NO policies for visitors,
--     so the public key cannot select/insert/update/delete tables directly.
--   * Visitors can only call the small "visitor" functions below. They can
--     like (once per visitor), add a view, read/add comments, start a
--     conversation and read/reply to THEIR OWN conversation using its
--     secret token. They can never delete or edit anything.
--   * Only the artist (the user listed in artist_accounts, signed in with
--     Supabase Auth) can call the artist_* functions: read all
--     conversations, reply as the artist, close/delete conversations and
--     delete comments.
--   * Simple abuse limits: length checks on every text field and rate
--     limits per visitor IP (stored only as a one-way hash).
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.art_stats (
  art_id     text primary key check (art_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  likes      integer not null default 0 check (likes >= 0),
  views      integer not null default 0 check (views >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.art_likes (
  art_id     text not null references public.art_stats(art_id) on delete cascade,
  visitor    uuid not null,
  created_at timestamptz not null default now(),
  primary key (art_id, visitor)
);

create table if not exists public.art_comments (
  id         bigint generated always as identity primary key,
  art_id     text not null references public.art_stats(art_id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  body       text not null check (char_length(body) between 1 and 500),
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index if not exists art_comments_art_idx on public.art_comments (art_id, created_at desc);

create table if not exists public.threads (
  id              uuid primary key default gen_random_uuid(),
  token_hash      text not null unique,            -- sha256 of the visitor's secret link token (the token itself is never stored)
  name            text not null check (char_length(name) between 1 and 60),
  email           text check (email is null or (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  kind            text not null default 'message' check (kind in ('message', 'commission')),
  commission_type text check (commission_type is null or char_length(commission_type) <= 60),
  budget          text check (budget is null or char_length(budget) <= 60),
  closed          boolean not null default false,
  artist_unread   boolean not null default true,
  client_unread   boolean not null default false,
  last_sender     text not null default 'client' check (last_sender in ('client', 'artist')),
  ip_hash         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists threads_updated_idx on public.threads (updated_at desc);

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  thread_id  uuid not null references public.threads(id) on delete cascade,
  sender     text not null check (sender in ('client', 'artist')),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

create table if not exists public.rate_events (
  bucket text not null,
  who    text not null,
  at     timestamptz not null default now()
);
create index if not exists rate_events_idx on public.rate_events (bucket, who, at);

-- The artist's Supabase Auth user id goes here (see README, step "link your login").
create table if not exists public.artist_accounts (
  user_id uuid primary key
);

-- ---------- lock tables down ----------
alter table public.art_stats       enable row level security;
alter table public.art_likes       enable row level security;
alter table public.art_comments    enable row level security;
alter table public.threads         enable row level security;
alter table public.messages        enable row level security;
alter table public.rate_events     enable row level security;
alter table public.artist_accounts enable row level security;
revoke all on public.art_stats, public.art_likes, public.art_comments, public.threads,
              public.messages, public.rate_events, public.artist_accounts from anon, authenticated;

-- ---------- helpers (not callable from the website) ----------
create or replace function public._ip_hash() returns text
language sql stable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
    split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1),
    'unknown'), 'UTF8')), 'hex');
$$;

create or replace function public._rate(p_bucket text, p_max integer, p_window interval) returns void
language plpgsql security definer set search_path = public as $$
declare v_who text := public._ip_hash(); v_n integer;
begin
  select count(*) into v_n from rate_events where bucket = p_bucket and who = v_who and at > now() - p_window;
  if v_n >= p_max then raise exception 'rate_limited' using hint = 'Please slow down and try again a little later.'; end if;
  insert into rate_events (bucket, who) values (p_bucket, v_who);
  if random() < 0.02 then delete from rate_events where at < now() - interval '2 days'; end if;
end $$;

create or replace function public._clean(p text, p_max integer) returns text
language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), p_max), '');
$$;

create or replace function public._token_hash(p_token text) returns text
language sql immutable as $$ select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex'); $$;

create or replace function public._check_art(p_art text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_art is null or p_art !~ '^[a-z0-9][a-z0-9-]{0,79}$' then raise exception 'bad_artwork'; end if;
  insert into art_stats (art_id) values (p_art) on conflict do nothing;
  return p_art;
end $$;

create or replace function public.is_artist() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.uid() is not null and exists (select 1 from artist_accounts where user_id = auth.uid()), false);
$$;

create or replace function public._require_artist() returns void
language plpgsql stable security definer set search_path = public as $$
begin if not public.is_artist() then raise exception 'not_artist'; end if; end $$;

-- ---------- visitor functions: likes, views, comments ----------
create or replace function public.get_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(s.art_id, jsonb_build_object(
           'likes', s.likes, 'views', s.views,
           'comments', (select count(*) from art_comments c where c.art_id = s.art_id))), '{}'::jsonb)
  from art_stats s;
$$;

create or replace function public.record_view(p_art text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  perform public._check_art(p_art);
  perform public._rate('view', 400, interval '1 hour');
  update art_stats set views = views + 1, updated_at = now() where art_id = p_art returning views into v;
  return jsonb_build_object('views', v);
end $$;

create or replace function public.like_art(p_art text, p_visitor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v integer; n integer;
begin
  if p_visitor is null then raise exception 'bad_visitor'; end if;
  perform public._check_art(p_art);
  perform public._rate('like', 60, interval '1 hour');
  insert into art_likes (art_id, visitor) values (p_art, p_visitor) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then update art_stats set likes = likes + 1, updated_at = now() where art_id = p_art; end if;
  select likes into v from art_stats where art_id = p_art;
  return jsonb_build_object('likes', v, 'new', n > 0);
end $$;

create or replace function public.get_comments(p_art text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'body', body, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
  from (select * from art_comments where art_id = p_art order by created_at desc limit 100) c;
$$;

create or replace function public.add_comment(p_art text, p_name text, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_name text := public._clean(p_name, 40); v_body text := public._clean(p_body, 500); r art_comments;
begin
  if v_name is null or v_body is null then raise exception 'empty'; end if;
  perform public._check_art(p_art);
  perform public._rate('comment', 5, interval '10 minutes');
  perform public._rate('comment-day', 30, interval '1 day');
  insert into art_comments (art_id, name, body, ip_hash) values (p_art, v_name, v_body, public._ip_hash()) returning * into r;
  return jsonb_build_object('id', r.id, 'name', r.name, 'body', r.body, 'created_at', r.created_at);
end $$;

-- ---------- visitor functions: private conversations ----------
create or replace function public.start_thread(p_name text, p_email text, p_kind text, p_commission_type text, p_budget text, p_message text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_name text := public._clean(p_name, 60); v_msg text := public._clean(p_message, 4000);
  v_email text := lower(public._clean(p_email, 120));
  v_kind text := case when p_kind = 'commission' then 'commission' else 'message' end;
  v_id uuid;
begin
  if v_name is null or v_msg is null then raise exception 'empty'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad_email'; end if;
  perform public._rate('thread', 4, interval '1 hour');
  perform public._rate('thread-day', 10, interval '1 day');
  insert into threads (token_hash, name, email, kind, commission_type, budget, ip_hash)
  values (public._token_hash(v_token), v_name, v_email, v_kind,
          case when v_kind = 'commission' then public._clean(p_commission_type, 60) end,
          case when v_kind = 'commission' then public._clean(p_budget, 60) end, public._ip_hash())
  returning id into v_id;
  insert into messages (thread_id, sender, body) values (v_id, 'client', v_msg);
  return jsonb_build_object('token', v_token);
end $$;

create or replace function public.get_thread(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t threads;
begin
  perform public._rate('read', 300, interval '1 hour');
  select * into t from threads where token_hash = public._token_hash(p_token);
  if not found then raise exception 'not_found'; end if;
  update threads set client_unread = false where id = t.id;
  return jsonb_build_object('name', t.name, 'kind', t.kind, 'commission_type', t.commission_type, 'budget', t.budget,
    'closed', t.closed, 'created_at', t.created_at,
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('sender', sender, 'body', body, 'created_at', created_at) order by created_at, id), '[]'::jsonb)
                 from messages where thread_id = t.id));
end $$;

create or replace function public.client_reply(p_token text, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t threads; v_body text := public._clean(p_body, 4000); r messages;
begin
  if v_body is null then raise exception 'empty'; end if;
  select * into t from threads where token_hash = public._token_hash(p_token);
  if not found then raise exception 'not_found'; end if;
  if t.closed then raise exception 'closed'; end if;
  perform public._rate('reply', 30, interval '1 hour');
  if (select count(*) from messages where thread_id = t.id) >= 300 then raise exception 'too_long'; end if;
  insert into messages (thread_id, sender, body) values (t.id, 'client', v_body) returning * into r;
  update threads set artist_unread = true, last_sender = 'client', updated_at = now() where id = t.id;
  return jsonb_build_object('name', t.name, 'kind', t.kind, 'sender', r.sender, 'body', r.body, 'created_at', r.created_at);
end $$;

-- status of the conversations saved in this browser ("new reply" badges)
create or replace function public.my_threads(p_tokens text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('i', x.i - 1, 'kind', t.kind, 'client_unread', t.client_unread,
           'last_sender', t.last_sender, 'updated_at', t.updated_at, 'closed', t.closed) order by x.i), '[]'::jsonb)
  from unnest(p_tokens[1:20]) with ordinality as x(tok, i)
  join threads t on t.token_hash = public._token_hash(x.tok);
$$;

-- ---------- artist-only functions ----------
create or replace function public.artist_inbox() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_artist();
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'email', t.email, 'kind', t.kind, 'commission_type', t.commission_type, 'budget', t.budget,
      'closed', t.closed, 'artist_unread', t.artist_unread, 'last_sender', t.last_sender, 'created_at', t.created_at, 'updated_at', t.updated_at,
      'count', (select count(*) from messages m where m.thread_id = t.id),
      'preview', (select left(m.body, 140) from messages m where m.thread_id = t.id order by m.created_at desc, m.id desc limit 1))
    order by t.updated_at desc), '[]'::jsonb) from threads t);
end $$;

create or replace function public.artist_thread(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t threads;
begin
  perform public._require_artist();
  update threads set artist_unread = false where id = p_id returning * into t;
  if not found then raise exception 'not_found'; end if;
  return jsonb_build_object('id', t.id, 'name', t.name, 'email', t.email, 'kind', t.kind, 'commission_type', t.commission_type,
    'budget', t.budget, 'closed', t.closed, 'created_at', t.created_at,
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('sender', sender, 'body', body, 'created_at', created_at) order by created_at, id), '[]'::jsonb)
                 from messages where thread_id = t.id));
end $$;

create or replace function public.artist_reply(p_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_body text := public._clean(p_body, 4000); r messages;
begin
  perform public._require_artist();
  if v_body is null then raise exception 'empty'; end if;
  if not exists (select 1 from threads where id = p_id) then raise exception 'not_found'; end if;
  insert into messages (thread_id, sender, body) values (p_id, 'artist', v_body) returning * into r;
  update threads set client_unread = true, artist_unread = false, last_sender = 'artist', updated_at = now() where id = p_id;
  return jsonb_build_object('sender', r.sender, 'body', r.body, 'created_at', r.created_at);
end $$;

create or replace function public.artist_set_closed(p_id uuid, p_closed boolean) returns void
language plpgsql security definer set search_path = public as $$
begin perform public._require_artist(); update threads set closed = coalesce(p_closed, false) where id = p_id; end $$;

create or replace function public.artist_delete_thread(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public._require_artist(); delete from threads where id = p_id; end $$;

create or replace function public.artist_comments() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_artist();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'art_id', art_id, 'name', name, 'body', body, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
          from (select * from art_comments order by created_at desc limit 300) c);
end $$;

create or replace function public.artist_delete_comment(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin perform public._require_artist(); delete from art_comments where id = p_id; end $$;

-- ---------- who may call what ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.get_stats(), public.record_view(text), public.like_art(text, uuid),
  public.get_comments(text), public.add_comment(text, text, text),
  public.start_thread(text, text, text, text, text, text), public.get_thread(text),
  public.client_reply(text, text), public.my_threads(text[]), public.is_artist()
  to anon, authenticated;
grant execute on function
  public.artist_inbox(), public.artist_thread(uuid), public.artist_reply(uuid, text),
  public.artist_set_closed(uuid, boolean), public.artist_delete_thread(uuid),
  public.artist_comments(), public.artist_delete_comment(bigint)
  to authenticated;
