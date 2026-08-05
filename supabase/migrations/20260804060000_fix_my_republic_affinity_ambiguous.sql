-- Fix: "column reference republic_id is ambiguous" -- brenda funksionit,
-- "republic_id" ishte njëkohësisht emri i OUT parametrit të vetë funksionit
-- (returns table (republic_id uuid, ...)) DHE emri i kolonës te posts/etj.,
-- kështu që Postgres s'dinte cilën po i referoheshim brenda query-t. Zgjidhje:
-- kolona e brendshme e nën-query-t emërtohet "rid" (jo "republic_id"), pa
-- prekur asgjë tjetër nga funksioni (të njëjtat rregulla, e njëjta logjikë).
create or replace function public.my_republic_affinity(p_user_id uuid)
returns table (republic_id uuid, affinity_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  return query
  select x.rid, count(*)::bigint as affinity_count
    from (
      select po.republic_id as rid from public.posts po where po.author_id = p_user_id
      union all
      select p.republic_id as rid from public.comments c
        join public.posts p on p.id = c.post_id
       where c.author_id = p_user_id
      union all
      select p.republic_id as rid from public.votes v
        join public.posts p on p.id = v.post_id
       where v.user_id = p_user_id
      union all
      select p.republic_id as rid from public.comment_convinces cc
        join public.comments c on c.id = cc.comment_id
        join public.posts p on p.id = c.post_id
       where cc.user_id = p_user_id
      union all
      select p.republic_id as rid from public.bookmarks b
        join public.posts p on p.id = b.post_id
       where b.user_id = p_user_id
    ) x
   group by x.rid;
end;
$$;
