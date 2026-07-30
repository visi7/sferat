-- Lets a user mute a Republic: its posts are excluded from their "All
-- Republics" mixed home feed, without unfollowing and without affecting
-- what they see if they visit that Republic's own page directly. This is
-- a client-side query filter (not RLS, unlike blocked_users) precisely
-- because visiting the Republic's page should still show everything.

create table if not exists public.muted_republics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  republic_id uuid not null references public.republics(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, republic_id)
);

create index if not exists idx_muted_republics_user on public.muted_republics (user_id);

alter table public.muted_republics enable row level security;

create policy muted_republics_owner on public.muted_republics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
