-- "Report user" (20260804010000) krijon raporte reported_user_id-only, por
-- escalate_report() vetëm dinte të trajtonte 'post'/'comment' — një Assistant
-- që shihte një raport përdoruesi (global, s'ka Republikë) do të merrte
-- "Invalid report type" nëse provonte ta përshkallëzonte. Rillogaritje e
-- plotë e funksionit me degën e tretë 'user' (gjithmonë global, v_republic_id
-- mbetet null -> vetëm is_global_reviewer/roli global njoftohen, jo
-- menaxherë të fushës, gjë që është korrekte për një raport pa Republikë).
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
  elsif p_type = 'user' then
    v_republic_id := null;
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
  elsif p_type = 'comment' then
    update public.reports set escalated_at = now(), escalated_by = auth.uid()
     where comment_id = p_target_id and status = 'pending' and escalated_at is null;
  else
    update public.reports set escalated_at = now(), escalated_by = auth.uid()
     where reported_user_id = p_target_id and status = 'pending' and escalated_at is null;
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
