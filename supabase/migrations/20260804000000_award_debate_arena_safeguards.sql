-- Zbulim gjatë testimit real: admini/marketing mod-i mund t'i shkruante
-- komente vetes te posti i arenës dhe pastaj t'i shpallte fituese, edhe pa
-- asnjë "Convinced me" nga dikush tjetër — pra pa asnjë vërtetim real
-- komuniteti. Dy rregulla të reja, zbatuar në vetë funksionin (jo vetëm në
-- UI), që s'mund të anashkalohen nga klienti:
--   1) s'mund të shpallësh fitues një koment që e ke shkruar vetë;
--   2) komenti duhet të ketë të paktën 1 "Convinced me" real.
create or replace function public.award_debate_arena(p_arena_id uuid, p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arena record;
  v_comment_author uuid;
  v_convince_count int;
begin
  if not (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid())) then
    raise exception 'Not authorized';
  end if;

  select * into v_arena from public.debate_arenas where id = p_arena_id;
  if v_arena is null then
    raise exception 'Arena not found';
  end if;

  select author_id into v_comment_author
    from public.comments
   where id = p_comment_id and post_id = v_arena.post_id;
  if v_comment_author is null then
    raise exception 'Comment not found for this arena''s debate post';
  end if;

  if v_comment_author = auth.uid() then
    raise exception 'You can''t award your own comment.';
  end if;

  select count(*) into v_convince_count
    from public.comment_convinces
   where comment_id = p_comment_id;
  if v_convince_count < 1 then
    raise exception 'This comment has no "Convinced me" marks yet from other users — it can''t be awarded.';
  end if;

  update public.debate_arenas
     set status = 'awarded', winner_comment_id = p_comment_id
   where id = p_arena_id;

  insert into public.notifications(user_id, type, payload)
  values (
    v_comment_author,
    'debate_arena_won',
    jsonb_build_object(
      'arena_id', p_arena_id,
      'post_id', v_arena.post_id,
      'comment_id', p_comment_id,
      'arena_title', v_arena.title,
      'prize_description', v_arena.prize_description
    )
  );
end;
$$;
