-- Creates the user_roles table, which was referenced by app code
-- (useIsModerator, LeftNav, shell.tsx, mod/panel) but never actually
-- existed in the schema — every "am I a moderator" check has been
-- silently failing (query error -> treated as "no").

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','moderator')),
  republic_id uuid references public.republics(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Partial unique indexes instead of a table-level UNIQUE constraint,
-- because NULL republic_id (= global role) would otherwise never collide
-- (Postgres treats NULLs as distinct in a normal unique constraint).
create unique index if not exists user_roles_global_unique
  on public.user_roles (user_id, role) where republic_id is null;
create unique index if not exists user_roles_per_republic_unique
  on public.user_roles (user_id, role, republic_id) where republic_id is not null;

create index if not exists idx_user_roles_user on public.user_roles (user_id);

alter table public.user_roles enable row level security;

do $$
begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'user_roles_select';
  if not found then
    create policy user_roles_select on public.user_roles for select using (true);
  end if;

  perform 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'user_roles_admin_write';
  if not found then
    create policy user_roles_admin_write on public.user_roles for all
      using (exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin' and ur.republic_id is null
      ))
      with check (exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin' and ur.republic_id is null
      ));
  end if;
end $$;

-- Bootstrap: make "test" a global admin so /mod/roles is usable immediately.
insert into public.user_roles (user_id, role, republic_id)
select id, 'admin', null from public.profiles where username = 'test'
on conflict do nothing;
