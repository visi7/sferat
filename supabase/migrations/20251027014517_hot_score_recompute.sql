drop trigger if exists votes_hot_trg on public.votes;
drop function if exists public.votes_hot_trg_router() cascade;
drop function if exists public.recompute_hot_score(uuid);

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
