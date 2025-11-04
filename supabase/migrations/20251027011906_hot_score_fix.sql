-- ✅ 1) Fshi të gjitha versionet e vjetra për siguri
drop trigger if exists votes_hot_trg on public.votes;
drop function if exists public.votes_hot_trg_router() cascade;
drop function if exists public.recompute_hot_score(uuid);
drop function if exists public.compute_hot_score(integer, timestamptz);
drop function if exists public.compute_hot_score(bigint, timestamptz);
drop function if exists public.compute_hot_score(bigint, timestamp with time zone);

-- ✅ 2) Krijo funksionin kryesor compute_hot_score
create or replace function public.compute_hot_score(vote_sum bigint, created timestamptz)
returns double precision
language plpgsql
as $$
declare
  order_score double precision;
  sign_score int;
  seconds_since double precision;
begin
  if vote_sum is null then
    vote_sum := 0;
  end if;

  if vote_sum > 0 then
    sign_score := 1;
  elsif vote_sum < 0 then
    sign_score := -1;
  else
    sign_score := 0;
  end if;

  order_score := ln(greatest(abs(vote_sum)::double precision, 1)) * sign_score;
  seconds_since := extract(epoch from (created - timestamp '1970-01-01'));

  return round(order_score + (seconds_since / 45000), 7);
end;
$$;

-- ✅ 3) Krijo funksionin që e thërret këtë
create or replace function public.recompute_hot_score(p_post_id uuid)
returns void
language sql
as $$
  update public.posts p
  set hot_score = public.compute_hot_score(
    coalesce((select sum(v.value) from public.votes v where v.post_id = p.id), 0),
    p.created_at
  )
  where p.id = p_post_id;
$$;

-- ✅ 4) Trigger që e thërret automatikisht
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
end$$;

create trigger votes_hot_trg
after insert or update or delete on public.votes
for each row
execute function public.votes_hot_trg_router();
