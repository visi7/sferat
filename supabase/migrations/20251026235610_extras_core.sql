alter table public.republics
  add column if not exists slug text,
  add column if not exists emoji text,
  add column if not exists is_active boolean not null default true;

create unique index if not exists republics_slug_unique on public.republics (slug);
alter table public.posts
  add column if not exists post_type text check (post_type in ('text','link','image','poll')) default 'text',
  add column if not exists url text,
  add column if not exists image_url text;
-- unikime
alter table public.bookmarks
  add constraint if not exists bookmarks_unique unique (user_id, post_id);

alter table public.follows_users
  add constraint if not exists follows_users_unique unique (follower_id, followed_user_id);

-- RLS (owner-only)
alter table public.bookmarks enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='bookmarks';
  if not found then
    create policy bookmarks_sel on public.bookmarks for select using (auth.uid() = user_id);
    create policy bookmarks_ins on public.bookmarks for insert with check (auth.uid() = user_id);
    create policy bookmarks_del on public.bookmarks for delete using (auth.uid() = user_id);
  end if;
end$$;

alter table public.follows_users enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='follows_users';
  if not found then
    create policy follows_sel on public.follows_users for select using (true);
    create policy follows_ins on public.follows_users for insert with check (auth.uid() = follower_id);
    create policy follows_del on public.follows_users for delete using (auth.uid() = follower_id);
  end if;
end$$;
create table if not exists public.comment_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  value int not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.comment_votes enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='comment_votes';
  if not found then
    create policy cv_sel on public.comment_votes for select using (true);
    create policy cv_ins on public.comment_votes for insert with check (auth.uid() = user_id);
    create policy cv_upd on public.comment_votes for update using (auth.uid() = user_id);
    create policy cv_del on public.comment_votes for delete using (auth.uid() = user_id);
  end if;
end$$;

alter table public.comment_reports enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='comment_reports';
  if not found then
    create policy cr_sel on public.comment_reports for select using (auth.uid() = reporter_id);
    create policy cr_ins on public.comment_reports for insert with check (auth.uid() = reporter_id);
  end if;
end$$;
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='notifications';
  if not found then
    create policy n_sel on public.notifications for select using (auth.uid() = user_id);
    create policy n_upd on public.notifications for update using (auth.uid() = user_id);
  end if;
end$$;

-- Trigger: kur shtohet koment, njofto autorin e postit
create or replace function public.notify_comment()
returns trigger
language plpgsql
as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    insert into public.notifications(user_id, type, payload)
    values (v_author, 'comment', jsonb_build_object('post_id', new.post_id, 'comment_id', new.id));
  end if;
  return new;
end
$$;

drop trigger if exists comments_notify_trg on public.comments;
create trigger comments_notify_trg
after insert on public.comments
for each row execute function public.notify_comment();
create index if not exists idx_bookmarks_user on public.bookmarks (user_id, created_at desc);
create index if not exists idx_followers_user on public.follows_users (follower_id, followed_user_id);
create index if not exists idx_notif_user_time on public.notifications (user_id, created_at desc);
