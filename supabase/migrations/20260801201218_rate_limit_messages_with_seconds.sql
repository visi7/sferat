-- Includes the exact remaining wait time in the rate-limit error message,
-- so the client can parse it and show a live countdown (same pattern as
-- the /forgot-password cooldown UI) instead of a plain static alert.

create or replace function public.enforce_post_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_last timestamptz;
  v_wait_seconds int;
begin
  select max(created_at) into v_last
  from public.posts
  where author_id = new.author_id;

  if v_last is not null then
    v_wait_seconds := 60 - floor(extract(epoch from (now() - v_last)))::int;
    if v_wait_seconds > 0 then
      raise exception 'You are posting too fast — please wait % seconds before posting again.', v_wait_seconds;
    end if;
  end if;

  return new;
end
$$;

create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_last timestamptz;
  v_wait_seconds int;
begin
  select max(created_at) into v_last
  from public.comments
  where author_id = new.author_id;

  if v_last is not null then
    v_wait_seconds := 10 - floor(extract(epoch from (now() - v_last)))::int;
    if v_wait_seconds > 0 then
      raise exception 'You are commenting too fast — please wait % seconds before commenting again.', v_wait_seconds;
    end if;
  end if;

  return new;
end
$$;
