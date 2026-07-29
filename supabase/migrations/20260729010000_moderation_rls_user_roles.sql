-- Moves moderation RLS off the abandoned profiles.is_moderator column
-- (never updated by anything, always false) onto the real user_roles
-- table, and adds per-Republic scoping.
--
-- Before this migration:
--   - reports_select_self_or_mod / reports_update_mod checked
--     profiles.is_moderator, which is false for everyone -> nobody
--     (not even a global admin) could see other people's reports, and
--     Accept/Reject silently updated 0 rows.
--   - posts/comments had NO moderator-override UPDATE policy at all,
--     so "Accept" (status = 'removed') had no RLS path to succeed for
--     a moderator acting on someone else's content.

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
      and role in ('admin', 'moderator')
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
      and role in ('admin', 'moderator')
      and (republic_id is null or republic_id = p_republic_id)
  );
$$;

-- reports: visible to the reporter themself, a global admin/moderator,
-- or a moderator of the Republic the reported post/comment belongs to.
drop policy if exists reports_select_self_or_mod on public.reports;
create policy reports_select_self_or_mod on public.reports for select using (
  reporter_id = auth.uid()
  or public.is_global_mod(auth.uid())
  or exists (
    select 1 from public.posts p
    where p.id = reports.post_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  )
  or exists (
    select 1 from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = reports.comment_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  )
);

drop policy if exists reports_update_mod on public.reports;
create policy reports_update_mod on public.reports for update using (
  public.is_global_mod(auth.uid())
  or exists (
    select 1 from public.posts p
    where p.id = reports.post_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  )
  or exists (
    select 1 from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = reports.comment_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  )
) with check (
  public.is_global_mod(auth.uid())
  or exists (
    select 1 from public.posts p
    where p.id = reports.post_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  )
  or exists (
    select 1 from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = reports.comment_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  )
);

-- posts/comments: previously only the author (within the edit window)
-- could update their own row, so moderators had no RLS path at all to
-- set status = 'removed' on someone else's content.
drop policy if exists posts_update_mod on public.posts;
create policy posts_update_mod on public.posts for update
  using (public.is_mod_of_republic(auth.uid(), republic_id))
  with check (public.is_mod_of_republic(auth.uid(), republic_id));

drop policy if exists comments_update_mod on public.comments;
create policy comments_update_mod on public.comments for update
  using (exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  ))
  with check (exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and public.is_mod_of_republic(auth.uid(), p.republic_id)
  ));
