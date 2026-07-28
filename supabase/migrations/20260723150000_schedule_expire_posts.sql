-- Schedules public.expire_posts() to run hourly via pg_cron. The function
-- already existed (marks posts as 'expired' once now() >= expires_at,
-- per the 7-day post lifecycle described in docs/VISION.md §7), but
-- nothing was ever invoking it.

do $$
begin
  perform cron.unschedule('expire-posts-hourly');
exception when others then null;
end $$;

select cron.schedule('expire-posts-hourly', '0 * * * *', $$select public.expire_posts();$$);
