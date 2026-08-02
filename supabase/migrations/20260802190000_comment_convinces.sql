-- "Convinced me" — shenjë e re, ndryshe nga upvote: lexuesi shënon një koment
-- specifik si atë që ia ndryshoi mendimin, jo thjesht që i pëlqeu. Mirroret
-- struktura e comment_votes/bookmarks (toggle, RLS owner-only për shkrim).

create table if not exists public.comment_convinces (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

alter table public.comment_convinces enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='comment_convinces';
  if not found then
    create policy cc_sel on public.comment_convinces for select using (true);
    create policy cc_ins on public.comment_convinces for insert with check (auth.uid() = user_id);
    create policy cc_del on public.comment_convinces for delete using (auth.uid() = user_id);
  end if;
end$$;

create index if not exists idx_comment_convinces_comment on public.comment_convinces (comment_id);
create index if not exists idx_comment_convinces_user on public.comment_convinces (user_id);

-- Njoftim autorit të komentit, njësoj si notify_comment_upvote
create or replace function public.notify_comment_convinced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_actor_username text;
begin
  select author_id into v_author from public.comments where id = new.comment_id;
  if v_author is not null and v_author <> new.user_id then
    select username into v_actor_username from public.profiles where id = new.user_id;
    insert into public.notifications(user_id, type, payload)
    values (v_author, 'comment_convinced', jsonb_build_object('comment_id', new.comment_id, 'actor_username', v_actor_username));
  end if;
  return new;
end
$$;

drop trigger if exists notify_comment_convinced_trg on public.comment_convinces;
create trigger notify_comment_convinced_trg
after insert on public.comment_convinces
for each row execute function public.notify_comment_convinced();
