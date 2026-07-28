-- Fixes and expands the notifications system.
--
-- notify_comment() inserted type='comment', but notifications_type_check
-- only allows ('reply','mention','follow','report_result') — every comment
-- from a user other than the post author was silently breaking the whole
-- comment insert (the trigger's constraint violation aborts the outer
-- transaction). This also standardizes on the type vocabulary the frontend
-- (NotificationBell.tsx, app/notifications/page.tsx) already expects:
-- comment_replied, post_upvoted, comment_upvoted, follow, report_result.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment_replied','post_upvoted','comment_upvoted','follow','report_result']));

-- Someone commented on your post
create or replace function public.notify_comment()
returns trigger
language plpgsql
as $$
declare
  v_author uuid;
  v_actor_username text;
  v_post_title text;
begin
  select author_id, title into v_author, v_post_title from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    select username into v_actor_username from public.profiles where id = new.author_id;
    insert into public.notifications(user_id, type, payload)
    values (
      v_author,
      'comment_replied',
      jsonb_build_object(
        'post_id', new.post_id,
        'comment_id', new.id,
        'actor_username', v_actor_username,
        'post_title', v_post_title
      )
    );
  end if;
  return new;
end
$$;

-- Someone upvoted your post
create or replace function public.notify_post_upvote()
returns trigger
language plpgsql
as $$
declare
  v_author uuid;
  v_actor_username text;
begin
  if new.value = 1 then
    select author_id into v_author from public.posts where id = new.post_id;
    if v_author is not null and v_author <> new.user_id then
      select username into v_actor_username from public.profiles where id = new.user_id;
      insert into public.notifications(user_id, type, payload)
      values (v_author, 'post_upvoted', jsonb_build_object('post_id', new.post_id, 'actor_username', v_actor_username));
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists notify_post_upvote_trg on public.votes;
create trigger notify_post_upvote_trg
after insert on public.votes
for each row execute function public.notify_post_upvote();

-- Someone upvoted your comment
create or replace function public.notify_comment_upvote()
returns trigger
language plpgsql
as $$
declare
  v_author uuid;
  v_actor_username text;
begin
  if new.value = 1 then
    select author_id into v_author from public.comments where id = new.comment_id;
    if v_author is not null and v_author <> new.user_id then
      select username into v_actor_username from public.profiles where id = new.user_id;
      insert into public.notifications(user_id, type, payload)
      values (v_author, 'comment_upvoted', jsonb_build_object('comment_id', new.comment_id, 'actor_username', v_actor_username));
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists notify_comment_upvote_trg on public.comment_votes;
create trigger notify_comment_upvote_trg
after insert on public.comment_votes
for each row execute function public.notify_comment_upvote();

-- Someone followed you
create or replace function public.notify_follow()
returns trigger
language plpgsql
as $$
declare
  v_actor_username text;
begin
  if new.followed_user_id <> new.follower_id then
    select username into v_actor_username from public.profiles where id = new.follower_id;
    insert into public.notifications(user_id, type, payload)
    values (new.followed_user_id, 'follow', jsonb_build_object('actor_username', v_actor_username));
  end if;
  return new;
end
$$;

drop trigger if exists notify_follow_trg on public.follows_users;
create trigger notify_follow_trg
after insert on public.follows_users
for each row execute function public.notify_follow();
