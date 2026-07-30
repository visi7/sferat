-- Lets a user block another user: hides that user's posts/comments from
-- their own view everywhere (feeds, republic pages, post detail, search),
-- enforced in RLS so it can't be missed by forgetting a filter somewhere
-- in the app code. One-directional: blocking someone doesn't stop them
-- from seeing or interacting with your content.

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_blocked_users_blocker on public.blocked_users (blocker_id);

alter table public.blocked_users enable row level security;

create policy blocked_users_owner on public.blocked_users for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- posts_read_all / comments_read_all were "using (true)" (fully open).
-- Now: hidden from a viewer who has blocked the author. auth.uid() is
-- null for logged-out visitors, so the exists() never matches and they
-- see everything, same as before.
drop policy if exists posts_read_all on public.posts;
create policy posts_read_all on public.posts for select using (
  not exists (
    select 1 from public.blocked_users b
    where b.blocker_id = auth.uid() and b.blocked_id = posts.author_id
  )
);

drop policy if exists comments_read_all on public.comments;
create policy comments_read_all on public.comments for select using (
  not exists (
    select 1 from public.blocked_users b
    where b.blocker_id = auth.uid() and b.blocked_id = comments.author_id
  )
);
