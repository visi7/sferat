-- Feed "For You" (leva algoritmike e diskutuar si mekanizëm rritjeje):
-- rirenditje në CLIENT (jo funksion i madh SQL "personalized_feed", siç u
-- ra dakord -- e lehtë për t'u eksperimentuar/kalibruar peshat pa migrime
-- të reja çdo herë). E vetmja pjesë që meriton të jetë server-side është
-- agregimi i "afinitetit" -- sa aktiv ka qenë ky përdorues në secilën
-- Republikë (postime + komente + vota + "Convinced me" + ruajtje) -- sepse
-- do të kërkonte tërheqjen e rreshtave të papërpunuar (potencialisht shumë)
-- në browser vetëm për t'i numëruar. Kufizuar tek vetë përdoruesi
-- (p_user_id = auth.uid()) -- votat/ruajtjet janë të dhëna private, s'duhet
-- të nxjerrim "sa aktiv është X te Republika Y" për dikë tjetër.
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
  select x.republic_id, count(*)::bigint as affinity_count
    from (
      select republic_id from public.posts where author_id = p_user_id
      union all
      select p.republic_id from public.comments c
        join public.posts p on p.id = c.post_id
       where c.author_id = p_user_id
      union all
      select p.republic_id from public.votes v
        join public.posts p on p.id = v.post_id
       where v.user_id = p_user_id
      union all
      select p.republic_id from public.comment_convinces cc
        join public.comments c on c.id = cc.comment_id
        join public.posts p on p.id = c.post_id
       where cc.user_id = p_user_id
      union all
      select p.republic_id from public.bookmarks b
        join public.posts p on p.id = b.post_id
       where b.user_id = p_user_id
    ) x
   group by x.republic_id;
end;
$$;
