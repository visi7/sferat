-- 1) Mbyllim një vrimë reale: askush s'e ndalonte dikë të shënonte
-- "Convinced me" te KOMENTI I VET (RLS-ja cc_ins kontrollonte vetëm
-- auth.uid() = user_id, jo nëse ai user është edhe autori i komentit).
-- Klienti (CommentItem.tsx) e fshihte tashmë butonin për autorin -- por
-- kjo s'është mbrojtje reale, thjesht UI; dikush mund ta thërriste insert-in
-- direkt. Kjo binte drejtpërdrejt mbi kushtin "≥1 Convinced me nga dikush
-- tjetër" të award_debate_arena() (20260804000000) -- vetë-convince e
-- anashkalonte lehtësisht -- dhe do të prekte edhe saktësinë e
-- leaderboard-it të ri (pika 2).

-- Pastrim retroaktiv: hiq çdo rresht ekzistues vetë-convince (nëse ka).
delete from public.comment_convinces cc
using public.comments c
where c.id = cc.comment_id and c.author_id = cc.user_id;

create or replace function public.block_self_convince()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.comments where id = new.comment_id;
  if v_author = new.user_id then
    raise exception 'You can''t mark your own comment as convincing.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comment_convinces_block_self on public.comment_convinces;
create trigger trg_comment_convinces_block_self
  before insert on public.comment_convinces
  for each row execute function public.block_self_convince();

-- 2) Leaderboard: kush "bindi" më shumë njerëz brenda X ditëve të fundit
-- (parazgjedhje 7). Vetëm SQL i thjeshtë (jo SECURITY DEFINER i nevojshëm
-- në kuptimin e ndjeshëm -- comment_convinces/comments/profiles janë
-- publikisht të lexueshme -- por e vendos SECURITY DEFINER gjithsesi për
-- performancë stabël, pa u ndikuar nga ndryshime të mundshme RLS në të
-- ardhmen). Përjashton komentet e hequra (status = 'removed').
create or replace function public.top_convincers(p_days int default 7, p_limit int default 10)
returns table (
  author_id uuid,
  username text,
  display_name text,
  avatar_url text,
  convince_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select c.author_id, p.username, p.display_name, p.avatar_url, count(*)::bigint as convince_count
    from public.comment_convinces cc
    join public.comments c on c.id = cc.comment_id
    join public.profiles p on p.id = c.author_id
   where cc.created_at >= now() - (p_days || ' days')::interval
     and coalesce(c.status, 'active') <> 'removed'
   group by c.author_id, p.username, p.display_name, p.avatar_url
   order by convince_count desc, c.author_id
   limit p_limit;
$$;
