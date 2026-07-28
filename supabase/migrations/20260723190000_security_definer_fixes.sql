-- Several trigger-backing functions write to a row owned by a DIFFERENT
-- user than the one performing the action (e.g. voting on someone else's
-- post/comment updates that post/comment; commenting/voting/following
-- inserts a notification for the OTHER person). None of them were marked
-- SECURITY DEFINER, so they ran with the acting user's own privileges and
-- RLS silently blocked the write the moment two different accounts were
-- actually involved (self-testing with one account never triggered it).

create or replace function public.recalc_post_scores(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_up   int;
  v_down int;
  v_score int;
  v_wilson numeric;
  v_age_hours numeric;
  v_decay numeric;
  v_hot numeric;
  v_created_at timestamptz;
begin
  select
    coalesce(sum(case when value = 1  then 1 else 0 end),0),
    coalesce(sum(case when value = -1 then 1 else 0 end),0)
  into v_up, v_down
  from public.votes
  where post_id = p_post_id;

  v_score := v_up - v_down;
  v_wilson := public.wilson_lower_bound(v_up, v_down);

  select created_at into v_created_at from public.posts where id = p_post_id;
  v_age_hours := extract(epoch from (now() - v_created_at)) / 3600.0;

  v_decay := exp(- v_age_hours / 48.0);
  v_hot := (v_wilson * 1000.0 + v_score * 0.1) * v_decay;

  update public.posts
  set upvotes   = v_up,
      downvotes = v_down,
      score     = v_score,
      wilson    = v_wilson,
      hot_score = v_hot
  where id = p_post_id;
end $$;

create or replace function public.recalc_comment_score(c_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.comments c
  set score = coalesce((select sum(value) from public.comment_votes where comment_id = c_id), 0)
  where c.id = c_id;
$$;

create or replace function public.recompute_hot_score(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts p
  set hot_score = public.compute_hot_score(
    coalesce((select sum(v.value) from public.votes v where v.post_id = p.id), 0),
    p.created_at
  )
  where p.id = p_post_id;
$$;

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_actor_username text;
  v_post_title text;
begin
  select author_id, title into v_author, v_post_title from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    select username into v_actor_username from public.profiles where id = new.author_id;
    insert into public.notifications(user_id, type, payload)
    values (
      v_author,
      'comment_replied',
      jsonb_build_object(
        'post_id', new.post_id,
        'comment_id', new.id,
        'actor_username', v_actor_username,
        'post_title', v_post_title
      )
    );
  end if;
  return new;
end
$$;

create or replace function public.notify_post_upvote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_actor_username text;
begin
  if new.value = 1 then
    select author_id into v_author from public.posts where id = new.post_id;
    if v_author is not null and v_author <> new.user_id then
      select username into v_actor_username from public.profiles where id = new.user_id;
      insert into public.notifications(user_id, type, payload)
      values (v_author, 'post_upvoted', jsonb_build_object('post_id', new.post_id, 'actor_username', v_actor_username));
    end if;
  end if;
  return new;
end
$$;

create or replace function public.notify_comment_upvote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_actor_username text;
begin
  if new.value = 1 then
    select author_id into v_author from public.comments where id = new.comment_id;
    if v_author is not null and v_author <> new.user_id then
      select username into v_actor_username from public.profiles where id = new.user_id;
      insert into public.notifications(user_id, type, payload)
      values (v_author, 'comment_upvoted', jsonb_build_object('comment_id', new.comment_id, 'actor_username', v_actor_username));
    end if;
  end if;
  return new;
end
$$;

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_username text;
begin
  if new.followed_user_id <> new.follower_id then
    select username into v_actor_username from public.profiles where id = new.follower_id;
    insert into public.notifications(user_id, type, payload)
    values (new.followed_user_id, 'follow', jsonb_build_object('actor_username', v_actor_username));
  end if;
  return new;
end
$$;

create or replace function public.notify_report_resolution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status in ('accepted','rejected')) then
    insert into public.notifications(user_id, type, payload)
    values (new.reporter_id, 'report_result',
            jsonb_build_object('report_id', new.id, 'status', new.status));
  end if;
  return new;
end $$;
