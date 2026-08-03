-- Rol i ri: "director" — global gjithmonë, njësoj si admin. Mban të njëjtat
-- pushtete moderimi përmbajtjeje si Moderator/Manager/Admin, plus mundësinë
-- t'u japë/heqë role Assistant/Moderator/Manager të tjerëve (jo Admin,
-- Director, apo Marketing — ato mbeten vetëm admin-global-only).

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('admin', 'manager', 'moderator', 'assistant', 'marketing', 'director'));

create or replace function public.is_director(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'director' and republic_id is null
  );
$$;

-- Zgjero funksionet e moderimit/shqyrtimit ekzistuese që të përfshijnë
-- "director" në të njëjtin nivel si admin/manager/moderator.
create or replace function public.is_global_mod(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'director', 'manager', 'moderator')
      and republic_id is null
  );
$$;

create or replace function public.is_mod_of_republic(p_user_id uuid, p_republic_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'director', 'manager', 'moderator')
      and (republic_id is null or republic_id = p_republic_id)
  );
$$;

create or replace function public.is_any_mod(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role in ('admin', 'director', 'manager', 'moderator')
  );
$$;

create or replace function public.is_global_reviewer(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'director', 'manager', 'moderator', 'assistant')
      and republic_id is null
  );
$$;

create or replace function public.is_reviewer_of_republic(p_user_id uuid, p_republic_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'director', 'manager', 'moderator', 'assistant')
      and (republic_id is null or republic_id = p_republic_id)
  );
$$;

-- Director mund t'u japë/heqë role Assistant/Moderator/Manager (jo më
-- shumë) — njësoj si carve-out-i ekzistues i Manager-it për Assistant,
-- por një shkallë më lart.
create policy user_roles_director_insert_modmgr on public.user_roles
  for insert
  with check (
    role in ('assistant', 'moderator', 'manager')
    and public.is_director(auth.uid())
  );

create policy user_roles_director_delete_modmgr on public.user_roles
  for delete
  using (
    role in ('assistant', 'moderator', 'manager')
    and public.is_director(auth.uid())
  );

-- Privatësia e listës së roleve: sot çdo përdorues i kyçur mund të lexojë
-- ROLET E TË GJITHËVE (policy "using (true)"), jo vetëm të vetat — kjo e
-- bënte listën "Current roles" të dukshme edhe për Manager. Tani: secili
-- sheh vetëm rreshtin e vet; Director sheh edhe rreshtat Assistant/
-- Moderator/Manager (i duhen për t'i menaxhuar); vetëm admini global sheh
-- gjithçka (përfshi Admin/Director/Marketing).
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select using (
  auth.uid() = user_id
  or public.is_global_admin(auth.uid())
  or (public.is_director(auth.uid()) and role in ('assistant', 'moderator', 'manager'))
);
