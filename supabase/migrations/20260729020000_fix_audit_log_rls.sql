-- The trg_report_audit trigger (fires on reports.status change) inserts
-- into audit_log via log_report_update(), which is NOT security definer
-- and runs as the acting moderator. audit_log's RLS still gated on the
-- abandoned profiles.is_moderator column (always false), so every
-- Accept/Reject in /mod/panel failed with "new row violates row-level
-- security policy for table audit_log" as soon as it hit the trigger.

create or replace function public.is_any_mod(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role in ('admin', 'moderator')
  );
$$;

drop policy if exists audit_mod_only on public.audit_log;
create policy audit_mod_only on public.audit_log for all
  using (public.is_any_mod(auth.uid()))
  with check (public.is_any_mod(auth.uid()));
