-- #1 (notification) + #2 (audit log) from the role-system ideas list:
-- every grant/revoke of a user_roles row now (a) writes an audit_log
-- entry recording who did it, to whom, and what, and (b) notifies the
-- affected user, unless they changed their own role (no self-notify).

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment_replied','post_upvoted','comment_upvoted','follow','report_result','role_changed']));

create or replace function public.log_and_notify_role_change()
returns trigger
language plpgsql
as $$
declare
  v_target uuid;
  v_role text;
  v_republic_id uuid;
  v_row_id uuid;
  v_action text;
  v_actor_username text;
  v_republic_title text;
begin
  if TG_OP = 'INSERT' then
    v_target := new.user_id; v_role := new.role; v_republic_id := new.republic_id;
    v_row_id := new.id; v_action := 'granted';
  else
    v_target := old.user_id; v_role := old.role; v_republic_id := old.republic_id;
    v_row_id := old.id; v_action := 'revoked';
  end if;

  insert into public.audit_log(actor_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    case when v_action = 'granted' then 'role_granted' else 'role_revoked' end,
    'user_roles',
    v_row_id,
    jsonb_build_object('target_user_id', v_target, 'role', v_role, 'republic_id', v_republic_id)
  );

  if v_target is distinct from auth.uid() then
    select username into v_actor_username from public.profiles where id = auth.uid();
    if v_republic_id is not null then
      select title into v_republic_title from public.republics where id = v_republic_id;
    end if;

    insert into public.notifications(user_id, type, payload)
    values (
      v_target,
      'role_changed',
      jsonb_build_object(
        'action', v_action,
        'role', v_role,
        'republic_id', v_republic_id,
        'republic_title', v_republic_title,
        'actor_username', v_actor_username
      )
    );
  end if;

  return null;
end
$$;

drop trigger if exists trg_user_role_audit_notify_insert on public.user_roles;
create trigger trg_user_role_audit_notify_insert
after insert on public.user_roles
for each row execute function public.log_and_notify_role_change();

drop trigger if exists trg_user_role_audit_notify_delete on public.user_roles;
create trigger trg_user_role_audit_notify_delete
after delete on public.user_roles
for each row execute function public.log_and_notify_role_change();
