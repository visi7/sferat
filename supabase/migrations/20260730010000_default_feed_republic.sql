-- Lets a user pick a default Republic for their home feed (instead of
-- always seeing "All Republics" mixed together). Null = no preference,
-- keeps today's behavior (All Republics).

alter table public.profiles
  add column if not exists default_republic_id uuid references public.republics(id) on delete set null;

-- Covered by the existing profiles_update_self RLS policy (auth.uid() = id)
-- since it applies to the whole row, no new policy needed.
