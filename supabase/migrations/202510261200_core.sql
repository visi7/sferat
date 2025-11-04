-- =========================
-- SFERAT: CORE MIGRATION
-- =========================

-- 0) Extensions (safe)
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- 1) Tables: ensure core columns
alter table public.posts
  add column if not exists score int not null default 0,
  add column if not exists hot_score double precision not null default 0;

-- votes: unik për (user,post)
alter table public.votes
  drop constraint if exists votes_user_post_unique,
  add constraint votes_user_post_unique unique (user_id, post_id);

-- 2) Indexes (perf)
create index if not exists idx_posts_status_created on public.posts (status, created_at desc);
create index if not exists idx_posts_status_hot     on public.posts (status, hot_score desc);
create index if not exists idx_posts_republic_new   on public.posts (republic_id, status, created_at desc);
create index if not exists idx_posts_republic_hot   on public.posts (republic_id, status, hot_score desc);
create index if not exists idx_votes_post           on public.votes (post_id);
create index if not exists idx_votes_user_post      on public.votes (user_id, post_id);
create index if not exists idx_comments_post_time   on public.comments (post_id, created_at);
create index if not exists idx_comment_votes_cu     on public.comment_votes (comment_id, user_id);

-- 3) Functions: hot score
drop function if exists public.compute_hot_score(int, timestamp with time zone);
drop function if exists public.recompute_hot_score(uuid);

create or replace function public.compute_hot_score(p_score int, p_created_at timestamptz)
returns double precision
language plpgsql
as $$
declare
  v_order double precision;
  v_sign  int;
  v_secs  double precision;
begin
  v_sign  := case when p_score > 0 then 1 when p_score < 0 then -1 else 0 end;
  v_order := log(greatest(abs(p_score), 1)) * v_sign;
  v_secs  := extract(epoch from (p_created_at - timestamp '1970-01-01 00:00:00'));
  return round((v_order + v_secs / 45000)::numeric, 7);
end
$$;

create or replace function public.recompute_hot_score(p_post_id uuid)
returns void
language plpgsql
as $$
declare
  v_score   int;
  v_created timestamptz;
begin
  select p.score, p.created_at
    into v_score, v_created
  from public.posts p
  where p.id = p_post_id;

  update public.posts p
     set hot_score = public.compute_hot_score(coalesce(v_score, 0), v_created)
   where p.id = p_post_id;
end
$$;

-- 4) Anti-spam: excessive_links + guard_links + triggers
drop function if exists public.guard_links() cascade;
create or replace function public.excessive_links(t text, max_links int default 3)
returns boolean
language sql
immutable
as $$
  select regexp_count(coalesce(t, ''), '(https?://|www\.)', 1, 'i') > max_links;
$$;

create or replace function public.guard_links()
returns trigger
language plpgsql
as $$
begin
  if new.body is not null and public.excessive_links(new.body, 3) then
    raise exception 'Too many links in body (anti-spam)';
  end if;
  return new;
end
$$;

drop trigger if exists posts_check_links_trg on public.posts;
create trigger posts_check_links_trg
before insert or update on public.posts
for each row execute function public.guard_links();

drop trigger if exists comments_check_links_trg on public.comments;
create trigger comments_check_links_trg
before insert or update on public.comments
for each row execute function public.guard_links();

-- 5) RPC: toggle_vote (ironclad, no ambiguity)
drop function if exists public.toggle_vote(uuid, int);

create or replace function public.toggle_vote(p_post_id uuid, p_value int)
returns table (score int, user_vote int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid;
  v_existing   int;
  v_new_score  int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'P0001';
  end if;
  if p_value not in (-1, 1) then
    raise exception 'Invalid vote value' using errcode = 'P0001';
  end if;

  select v.value into v_existing
  from public.votes v
  where v.user_id = v_uid and v.post_id = p_post_id;

  if v_existing is null then
    insert into public.votes(user_id, post_id, value)
    values (v_uid, p_post_id, p_value);
  elsif v_existing = p_value then
    delete from public.votes
    where user_id = v_uid and post_id = p_post_id;
  else
    update public.votes
       set value = p_value
     where user_id = v_uid and post_id = p_post_id;
  end if;

  select coalesce(sum(v.value), 0) into v_new_score
  from public.votes v
  where v.post_id = p_post_id;

  update public.posts p
     set score = v_new_score
   where p.id = p_post_id;

  perform public.recompute_hot_score(p_post_id);

  return query
  select p.score::int,
         coalesce((select v.value from public.votes v
                    where v.user_id = v_uid and v.post_id = p_post_id), 0)::int
  from public.posts p
  where p.id = p_post_id;
end
$$;

-- 6) RLS: votes — politika kanonike
alter table public.votes enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='votes'
  loop
    execute format('drop policy if exists %I on public.votes', r.policyname);
  end loop;
end$$;

create policy votes_sel on public.votes
  for select using (true);

create policy votes_ins on public.votes
  for insert with check (auth.uid() = user_id);

create policy votes_upd on public.votes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy votes_del on public.votes
  for delete using (auth.uid() = user_id);
