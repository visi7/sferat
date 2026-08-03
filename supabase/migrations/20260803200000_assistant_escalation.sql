-- Lejon një Assistant të përshkallëzojë ("escalate") drejtpërdrejt te
-- menaxheri i tij konkret (jo te gjithë ekipi), edhe kur raporti s'ka
-- arritur ende pragun e 3 raportimeve që kërkohet për t'u pranuar/refuzuar.
--
-- Hapi 1: dimë "kush e caktoi kë" — kolonë e re granted_by, e mbushur
-- automatikisht (jo nga klienti) nga një trigger BEFORE INSERT.
alter table public.user_roles add column if not exists granted_by uuid references public.profiles(id) on delete set null;

create or replace function public.set_user_roles_granted_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.granted_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_user_roles_set_granted_by on public.user_roles;
create trigger trg_user_roles_set_granted_by
before insert on public.user_roles
for each row execute function public.set_user_roles_granted_by();

-- Hapi 2: shënim përshkallëzimi mbi raportet ekzistuese.
alter table public.reports add column if not exists escalated_at timestamptz;
alter table public.reports add column if not exists escalated_by uuid references public.profiles(id) on delete set null;

-- Hapi 3: lejo tipin e ri të njoftimit.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment_replied','post_upvoted','comment_upvoted','follow','report_result','role_changed','comment_convinced','debate_arena_won','report_escalated']));

-- Hapi 4: vetë përshkallëzimi — autorizim (duhet reviewer i asaj fushe),
-- shënim mbi raportet përkatëse, dhe njoftim te menaxheri konkret që e
-- caktoi këtë Assistent në atë fushë (global ose Republikë specifike).
-- Nëse ai menaxher s'e mban më rolin, bie mbrapsht dhe njofton gjithë
-- ekipin me të drejtë zgjidhjeje në atë fushë — sinjali s'humbet kurrë.
create or replace function public.escalate_report(p_type text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_republic_id uuid;
  v_manager_id uuid;
  v_assistant_username text;
  v_notified boolean := false;
begin
  if p_type = 'post' then
    select republic_id into v_republic_id from public.posts where id = p_target_id;
  elsif p_type = 'comment' then
    select p.republic_id into v_republic_id
      from public.comments c join public.posts p on p.id = c.post_id
     where c.id = p_target_id;
  else
    raise exception 'Invalid report type';
  end if;

  if not (public.is_global_reviewer(auth.uid()) or public.is_reviewer_of_republic(auth.uid(), v_republic_id)) then
    raise exception 'Not authorized';
  end if;

  select username into v_assistant_username from public.profiles where id = auth.uid();

  if p_type = 'post' then
    update public.reports set escalated_at = now(), escalated_by = auth.uid()
     where post_id = p_target_id and status = 'pending' and escalated_at is null;
  else
    update public.reports set escalated_at = now(), escalated_by = auth.uid()
     where comment_id = p_target_id and status = 'pending' and escalated_at is null;
  end if;

  -- menaxheri që e caktoi këtë Assistent në këtë fushë (Republikë specifike
  -- ka përparësi ndaj rolit global, nëse i ka të dyja).
  select granted_by into v_manager_id
    from public.user_roles
   where user_id = auth.uid()
     and role = 'assistant'
     and (republic_id is null or republic_id = v_republic_id)
   order by (republic_id = v_republic_id) desc nulls last
   limit 1;

  if v_manager_id is not null
     and (public.is_global_mod(v_manager_id) or public.is_mod_of_republic(v_manager_id, v_republic_id)) then
    insert into public.notifications(user_id, type, payload)
    values (
      v_manager_id, 'report_escalated',
      jsonb_build_object('target_type', p_type, 'target_id', p_target_id, 'republic_id', v_republic_id, 'actor_username', v_assistant_username)
    );
    v_notified := true;
  end if;

  if not v_notified then
    insert into public.notifications(user_id, type, payload)
    select distinct ur.user_id, 'report_escalated',
      jsonb_build_object('target_type', p_type, 'target_id', p_target_id, 'republic_id', v_republic_id, 'actor_username', v_assistant_username)
      from public.user_roles ur
     where ur.role in ('admin', 'manager', 'moderator')
       and (ur.republic_id is null or ur.republic_id = v_republic_id);
  end if;
end;
$$;
