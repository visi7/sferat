-- Pezullim llogarie (read-only): admin/director mund të pezullojnë një
-- përdorues nga /mod/panel (mbi një raport të tipit 'user'). I pezulluari
-- mund të kyçet dhe të shohë platformën normalisht, por s'mund të
-- postojë/komentojë/votojë/ndjekë -- zbatuar me trigger BEFORE INSERT
-- (jo duke prekur RLS insert-policy-t ekzistuese të posts/comments/votes/
-- follows_users, që janë pjesë e skemës "restauruar" -- s'i njohim emrat/
-- definicionet e sakta për t'i rishkruar në mënyrë të sigurt). Triggeri
-- jep gjithmonë mesazh të qartë (arsyeja + deri kur), jo thjesht "RLS denied".
--
-- suspended_until = null domethënë PËRGJITHMONË (jo "s'ka afat/gabim").

alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists suspended_by uuid references public.profiles(id) on delete set null;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment_replied','post_upvoted','comment_upvoted','follow','report_result','role_changed','comment_convinced','debate_arena_won','report_escalated','account_suspended']));

create or replace function public.is_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = p_user_id
       and suspended_at is not null
       and (suspended_until is null or suspended_until > now())
  );
$$;

create or replace function public.block_if_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_until timestamptz;
  v_reason text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return new;
  end if;

  if public.is_suspended(v_uid) then
    select suspended_until, suspension_reason into v_until, v_reason
      from public.profiles where id = v_uid;
    raise exception 'Your account is suspended (%): %',
      case when v_until is null then 'permanently' else 'until ' || v_until::text end,
      coalesce(v_reason, 'no reason given');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_posts_block_suspended on public.posts;
create trigger trg_posts_block_suspended
  before insert on public.posts
  for each row execute function public.block_if_suspended();

drop trigger if exists trg_comments_block_suspended on public.comments;
create trigger trg_comments_block_suspended
  before insert on public.comments
  for each row execute function public.block_if_suspended();

drop trigger if exists trg_votes_block_suspended on public.votes;
create trigger trg_votes_block_suspended
  before insert on public.votes
  for each row execute function public.block_if_suspended();

drop trigger if exists trg_comment_votes_block_suspended on public.comment_votes;
create trigger trg_comment_votes_block_suspended
  before insert on public.comment_votes
  for each row execute function public.block_if_suspended();

drop trigger if exists trg_follows_users_block_suspended on public.follows_users;
create trigger trg_follows_users_block_suspended
  before insert on public.follows_users
  for each row execute function public.block_if_suspended();

-- RPC: pezullim (admin/director), me arsye e detyrueshme dhe kohëzgjatje
-- opsionale (orë; null = përgjithmonë). Njofton vetë të pezulluarin.
create or replace function public.suspend_user(p_user_id uuid, p_reason text, p_duration_hours int default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
  v_clean_reason text;
begin
  if not (public.is_global_admin(auth.uid()) or public.is_director(auth.uid())) then
    raise exception 'Not authorized';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t suspend yourself.';
  end if;

  v_clean_reason := btrim(coalesce(p_reason, ''));
  if v_clean_reason = '' then
    raise exception 'A reason is required.';
  end if;

  v_until := case when p_duration_hours is null then null else now() + (p_duration_hours || ' hours')::interval end;

  update public.profiles
     set suspended_at = now(),
         suspended_until = v_until,
         suspension_reason = v_clean_reason,
         suspended_by = auth.uid()
   where id = p_user_id;

  insert into public.notifications(user_id, type, payload)
  values (
    p_user_id,
    'account_suspended',
    jsonb_build_object('reason', v_clean_reason, 'until', v_until)
  );
end;
$$;

-- RPC: heqje pezullimi (admin/director)
create or replace function public.unsuspend_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_global_admin(auth.uid()) or public.is_director(auth.uid())) then
    raise exception 'Not authorized';
  end if;

  update public.profiles
     set suspended_at = null,
         suspended_until = null,
         suspension_reason = null,
         suspended_by = null
   where id = p_user_id;
end;
$$;
