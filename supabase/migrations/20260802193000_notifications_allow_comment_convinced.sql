-- notify_comment_convinced() fut type='comment_convinced', por
-- notifications_type_check ende s'e lejonte — çdo "Convinced me" dështonte
-- (rrëzohej edhe insert-i vetë, meqë trigger-i vrapon në të njëjtin transaction).

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment_replied','post_upvoted','comment_upvoted','follow','report_result','role_changed','comment_convinced']));
