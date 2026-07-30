-- Extends the moderation role system from 2 tiers (admin/moderator) to 4:
--
--   assistant  — view-only. Can see reports, cannot Accept/Reject.
--   moderator  — full Accept/Reject within their Republic (unchanged).
--   manager    — same powers as moderator, meant for someone overseeing
--                a Republic (or globally, if republic_id is null).
--   admin      — unchanged, global, full control.
--
-- Role assignment itself (who can grant these roles via /mod/roles) stays
-- global-admin-only for now — not extended in this migration.

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('admin', 'manager', 'moderator', 'assistant'));

-- Resolve-capable roles (can Accept/Reject, can remove posts/comments):
-- admin, manager, moderator. Assistant is deliberately excluded.
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
      and role in ('admin', 'manager', 'moderator')
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
      and role in ('admin', 'manager', 'moderator')
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
    where user_id = p_user_id and role in ('admin', 'manager', 'moderator')
  );
$$;

-- View-capable roles (can SEE reports, cannot resolve them): everyone
-- resolve-capable, plus assistant.
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
      and role in ('admin', 'manager', 'moderator', 'assistant')
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
      and role in ('admin', 'manager', 'moderator', 'assistant')
      and (republic_id is null or republic_id = p_republic_id)
  );
$$;

-- reports: SELECT now uses the reviewer (view-capable) functions, so
-- assistants can see reports. UPDATE (resolving) keeps using the
-- resolve-capable functions, so assistants cannot Accept/Reject —
-- enforced here at the DB level, not just hidden in the UI.
drop policy if exists reports_select_self_or_mod on public.reports;
create policy reports_select_self_or_mod on public.reports for select using (
  reporter_id = auth.uid()
  or public.is_global_reviewer(auth.uid())
  or exists (
    select 1 from public.posts p
    where p.id = reports.post_id
      and public.is_reviewer_of_republic(auth.uid(), p.republic_id)
  )
  or exists (
    select 1 from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = reports.comment_id
      and public.is_reviewer_of_republic(auth.uid(), p.republic_id)
  )
);

-- reports_update_mod, posts_update_mod, comments_update_mod, audit_mod_only,
-- republics_write_mod already call is_global_mod / is_mod_of_republic /
-- is_any_mod, whose bodies were just redefined above to include 'manager' —
-- no need to touch those policies themselves.
