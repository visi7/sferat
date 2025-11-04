-- =========================================================
-- SFERAT - Cleanup & Performance Migration (safe/idempotent)
-- =========================================================

-- 1) INDEXE PERFORMANCE -----------------------------------
create index if not exists idx_posts_status_created
  on public.posts (status, created_at desc);

create index if not exists idx_posts_status_hot
  on public.posts (status, hot_score desc);

create index if not exists idx_posts_republic_new
  on public.posts (status, republic_id, created_at desc);

create index if not exists idx_posts_republic_hot
  on public.posts (status, republic_id, hot_score desc);

create index if not exists idx_votes_post
  on public.votes (post_id);

create index if not exists idx_votes_user_post
  on public.votes (user_id, post_id);

create index if not exists idx_comments_post_time
  on public.comments (post_id, created_at);

create index if not exists idx_comment_votes_cu
  on public.comment_votes (comment_id, user_id);


-- 2) CONSTRAINTE UNIKE (me kontroll nga pg_constraint) ----
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'votes_unique') then
    alter table public.votes
      add constraint votes_unique unique (user_id, post_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookmarks_unique') then
    alter table public.bookmarks
      add constraint bookmarks_unique unique (user_id, post_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'follows_users_unique') then
    alter table public.follows_users
      add constraint follows_users_unique unique (follower_id, followed_user_id);
  end if;
end$$;


-- 3) FUNKSIONE & TRIGGER PËR HOT SCORE --------------------
create or replace function public.recompute_hot_score(p_post_id uuid)
returns void
language sql
as $$
  update public.posts p
  set hot_score = public.compute_hot_score(
    coalesce( (select sum(value) from public.votes v where v.post_id = p.id), 0 ),
    p.created_at
  )
  where p.id = p_post_id;
$$;

-- router për INSERT/UPDATE/DELETE (jo pg_temp që zhduket)
create or replace function public.votes_hot_trg_router()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_hot_score(old.post_id);
  else
    perform public.recompute_hot_score(new.post_id);
  end if;
  return null;
end
$$;

drop trigger if exists votes_hot_trg on public.votes;
create trigger votes_hot_trg
after insert or update or delete on public.votes
for each row
execute function public.votes_hot_trg_router();


-- 4) BACKFILL HOT SCORE (vetëm kur është null) ------------
update public.posts p
set hot_score = public.compute_hot_score(
  coalesce( (select sum(value) from public.votes v where v.post_id = p.id), 0 ),
  p.created_at
)
where p.hot_score is null;


-- 5) RLS sanity për VOTES (krijo nëse mungojnë) ------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='votes'
  ) then
    create policy votes_sel on public.votes for select using (true);
    create policy votes_ins on public.votes for insert with check (auth.uid() = user_id);
    create policy votes_upd on public.votes for update using (auth.uid() = user_id);
    create policy votes_del on public.votes for delete using (auth.uid() = user_id);
  end if;
end$$;


-- 6) ANALYZE për statistika të freskëta --------------------
analyze public.posts;
analyze public.votes;
analyze public.comments;
-- === FUNKSIONI I MUNGUAR: compute_hot_score =====================
create or replace function public.compute_hot_score(vote_sum int, created timestamptz)
returns double precision
language plpgsql
as $$
declare
  order_score double precision;
  sign_score int;
  seconds_since double precision;
begin
  -- Nëse s’ka vota, lëre si 0
  if vote_sum is null then
    vote_sum := 0;
  end if;

  -- Llogaritja e bazuar në sistemin e Reddit (logaritmik + kohë)
  if vote_sum > 0 then
    sign_score := 1;
  elsif vote_sum < 0 then
    sign_score := -1;
  else
    sign_score := 0;
  end if;

  order_score := log(greatest(abs(vote_sum), 1)) * sign_score;
  seconds_since := extract(epoch from (created - timestamp '1970-01-01'));

  return round(order_score + (seconds_since / 45000), 7);
end;
$$;
