-- republics_write_mod still gated on the abandoned profiles.is_moderator
-- column, same class of bug as reports/posts/comments/audit_log. No UI
-- writes to `republics` yet, so this had no visible symptom today, but it
-- would have failed silently the moment such a UI existed. Moved onto
-- user_roles for consistency with the rest of the moderation RLS.

drop policy if exists republics_write_mod on public.republics;
create policy republics_write_mod on public.republics for all
  using (public.is_global_mod(auth.uid()))
  with check (public.is_global_mod(auth.uid()));
