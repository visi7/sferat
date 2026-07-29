-- Fixes 42P17 "infinite recursion detected in policy for relation user_roles".
--
-- The policy user_roles_admin_write (created in 20260723220000_user_roles.sql)
-- checks "is this user a global admin" by running a SELECT against
-- user_roles itself. Postgres has to apply RLS to that inner SELECT too,
-- which means re-evaluating this very policy again — forever. This broke
-- EVERY query against user_roles, including plain SELECTs, because the
-- policy is FOR ALL (applies to select/insert/update/delete alike).
--
-- Fix: move the admin check into a SECURITY DEFINER function. Such a
-- function runs with the privileges of its owner (the table owner, which
-- bypasses RLS by default), so its internal query on user_roles does not
-- re-trigger RLS — breaking the recursion.

create or replace function public.is_global_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'admin' and republic_id is null
  );
$$;

drop policy if exists user_roles_admin_write on public.user_roles;

create policy user_roles_admin_write on public.user_roles for all
  using (public.is_global_admin(auth.uid()))
  with check (public.is_global_admin(auth.uid()));
