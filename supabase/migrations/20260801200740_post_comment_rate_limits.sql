-- Anti-flood: without this, a single account (or a script) could post or
-- comment as fast as the API allows, flooding feeds and manipulating "New"
-- rankings. Enforced as a DB trigger (not just client-side) so it can't be
-- bypassed by calling the API directly.
--
-- Thresholds are deliberately loose (not full anti-spam/anti-bot defense,
-- just a floor against obvious flooding): 1 post per 60s, 1 comment per 10s,
-- per author. Moderators/admins are not exempted — keeps this simple, and
-- a short wait is an acceptable cost for the rare case they hit it.

create or replace function public.enforce_post_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_last timestamptz;
begin
  select max(created_at) into v_last
  from public.posts
  where author_id = new.author_id;

  if v_last is not null and now() - v_last < interval '60 seconds' then
    raise exception 'You are posting too fast — please wait a bit before posting again.';
  end if;

  return new;
end
$$;

drop trigger if exists trg_posts_rate_limit on public.posts;
create trigger trg_posts_rate_limit
before insert on public.posts
for each row execute function public.enforce_post_rate_limit();

create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_last timestamptz;
begin
  select max(created_at) into v_last
  from public.comments
  where author_id = new.author_id;

  if v_last is not null and now() - v_last < interval '10 seconds' then
    raise exception 'You are commenting too fast — please wait a moment.';
  end if;

  return new;
end
$$;

drop trigger if exists trg_comments_rate_limit on public.comments;
create trigger trg_comments_rate_limit
before insert on public.comments
for each row execute function public.enforce_comment_rate_limit();
