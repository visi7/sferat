-- Arena e debatit të sponsorizuar — ripërdor infrastrukturën ekzistuese
-- (posts/comments/comment_convinces) në vend që të ndërtojë koment/votim të
-- ri: një "arenë" është thjesht metadata sponsorizimi mbi një postim të
-- zakonshëm, ku debati zhvillohet saktësisht si te çdo postim tjetër.

create table if not exists public.debate_arenas (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  title text not null,
  description text,
  prize_description text,
  post_id uuid not null references public.posts(id) on delete cascade,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'awarded')),
  winner_comment_id uuid references public.comments(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.debate_arenas enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'debate_arenas';
  if not found then
    create policy da_sel on public.debate_arenas for select using (true);
    create policy da_ins on public.debate_arenas
      for insert with check (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()));
    create policy da_upd on public.debate_arenas
      for update using (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()));
    create policy da_del on public.debate_arenas
      for delete using (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()));
  end if;
end$$;

create index if not exists idx_debate_arenas_post on public.debate_arenas (post_id);
create index if not exists idx_debate_arenas_status on public.debate_arenas (status, ends_at);

-- Njoftimi i ri për fituesin — shto në listën e lejuar (njësoj si me
-- comment_convinced më parë).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment_replied','post_upvoted','comment_upvoted','follow','report_result','role_changed','comment_convinced','debate_arena_won']));

-- Krijimi i arenës: e gjitha brenda një funksioni të vetëm (autorizim +
-- krijimi i postimit real + krijimi i rreshtit të arenës), që të mos mbetet
-- kurrë postim "jetim" nëse dështon vetëm hapi i dytë.
create or replace function public.create_debate_arena(
  p_sponsor_name text,
  p_title text,
  p_description text,
  p_prize_description text,
  p_republic_id uuid,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
  v_arena_id uuid;
begin
  if not (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid())) then
    raise exception 'Not authorized';
  end if;

  insert into public.posts (title, body, url, image_url, republic_id, author_id, post_type, section, expires_at)
  values (p_title, coalesce(p_description, ''), null, null, p_republic_id, auth.uid(), 'text', 'feed', p_ends_at)
  returning id into v_post_id;

  insert into public.debate_arenas (sponsor_name, title, description, prize_description, post_id, ends_at, created_by)
  values (p_sponsor_name, p_title, p_description, p_prize_description, v_post_id, p_ends_at, auth.uid())
  returning id into v_arena_id;

  return v_arena_id;
end;
$$;

-- Shpallja e fituesit: e gjitha brenda një funksioni të vetëm (autorizim +
-- update + njoftim), që klienti s'mund ta anashkalojë apo ta bëjë pjesërisht.
create or replace function public.award_debate_arena(p_arena_id uuid, p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arena record;
  v_comment_author uuid;
begin
  if not (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid())) then
    raise exception 'Not authorized';
  end if;

  select * into v_arena from public.debate_arenas where id = p_arena_id;
  if v_arena is null then
    raise exception 'Arena not found';
  end if;

  select author_id into v_comment_author
    from public.comments
   where id = p_comment_id and post_id = v_arena.post_id;
  if v_comment_author is null then
    raise exception 'Comment not found for this arena''s debate post';
  end if;

  update public.debate_arenas
     set status = 'awarded', winner_comment_id = p_comment_id
   where id = p_arena_id;

  insert into public.notifications(user_id, type, payload)
  values (
    v_comment_author,
    'debate_arena_won',
    jsonb_build_object(
      'arena_id', p_arena_id,
      'post_id', v_arena.post_id,
      'comment_id', p_comment_id,
      'arena_title', v_arena.title,
      'prize_description', v_arena.prize_description
    )
  );
end;
$$;
