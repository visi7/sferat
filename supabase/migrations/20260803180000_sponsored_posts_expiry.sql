-- Skadim automatik për reklamat e sponsorizuara — njësoj si postimet normale
-- (expire_posts / cron ekzistues), por për sponsored_posts. expires_at = null
-- do të thotë "pa afat", qëndron aktive derisa dikush ta çaktivizojë me dorë.

alter table public.sponsored_posts add column if not exists expires_at timestamptz;

create or replace function public.expire_sponsored_posts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sponsored_posts
     set is_active = false
   where is_active = true
     and expires_at is not null
     and expires_at <= now();
end;
$$;

do $$
begin
  perform cron.unschedule('expire-sponsored-posts-hourly');
exception when others then null;
end $$;

select cron.schedule(
  'expire-sponsored-posts-hourly',
  '0 * * * *',
  $$select public.expire_sponsored_posts();$$
);
