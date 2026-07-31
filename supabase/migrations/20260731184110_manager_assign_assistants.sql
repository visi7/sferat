-- Lets a Manager (global or Republic-scoped) grant/revoke the "assistant"
-- role within their own scope, without needing a Global Admin.
--
-- A Manager can ONLY insert/delete rows with role = 'assistant', and only
-- within their own scope: a Republic-scoped manager may only touch
-- assistants of that same Republic; a global-scoped manager may touch
-- assistants anywhere (global or any specific Republic). Managers still
-- cannot grant moderator/manager/admin roles, or touch roles outside
-- their own scope — that remains Global-Admin-only via
-- user_roles_admin_write (unchanged).

create or replace function public.is_manager_of_scope(p_user_id uuid, p_republic_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role = 'manager'
      and (republic_id is null or republic_id = p_republic_id)
  );
$$;

create policy user_roles_manager_insert_assistant on public.user_roles
  for insert
  with check (
    role = 'assistant'
    and public.is_manager_of_scope(auth.uid(), republic_id)
  );

create policy user_roles_manager_delete_assistant on public.user_roles
  for delete
  using (
    role = 'assistant'
    and public.is_manager_of_scope(auth.uid(), republic_id)
  );
