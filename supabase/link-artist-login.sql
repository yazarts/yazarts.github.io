-- Run this ONCE in the Supabase SQL Editor AFTER you created your login under
-- Authentication -> Users -> Add user (email aitazouzabdellah@gmail.com).
-- It marks that login as "the artist", so only it can open the private inbox.
insert into public.artist_accounts (user_id)
select id from auth.users where lower(email) = lower('aitazouzabdellah@gmail.com')
on conflict do nothing;

-- check: should return one row
select u.email from public.artist_accounts a join auth.users u on u.id = a.user_id;
