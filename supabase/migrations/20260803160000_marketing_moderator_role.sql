-- Rol i ri: "marketing" — administron VETËM Agora-n (sponsored_posts), pa
-- pushtetet e moderimit normal (reports/posts/comments të Republikave).
-- Nuk ka lidhje me Republika, kështu që republic_id mbetet gjithmonë null
-- (njësoj si admin global). Caktimi i rolit mbetet admin-global-only, si
-- gjithë rolet e tjera përveç "assistant" (ai i Manager-it).

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('admin', 'manager', 'moderator', 'assistant', 'marketing'));

create or replace function public.is_marketing_mod(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'marketing'
  );
$$;

-- Zgjero RLS-in e sponsored_posts që marketing mod-i të shohë/shkruajë,
-- krahas admin global.
drop policy if exists sp_sel on public.sponsored_posts;
create policy sp_sel on public.sponsored_posts
  for select using (
    is_active = true
    or public.is_global_admin(auth.uid())
    or public.is_marketing_mod(auth.uid())
  );

drop policy if exists sp_ins on public.sponsored_posts;
create policy sp_ins on public.sponsored_posts
  for insert with check (
    public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid())
  );

drop policy if exists sp_upd on public.sponsored_posts;
create policy sp_upd on public.sponsored_posts
  for update using (
    public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid())
  );

drop policy if exists sp_del on public.sponsored_posts;
create policy sp_del on public.sponsored_posts
  for delete using (
    public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid())
  );
