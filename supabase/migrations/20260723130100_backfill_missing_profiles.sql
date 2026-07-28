-- One-time backfill: creates public.profiles rows for any existing
-- auth.users that were created before the on_auth_user_created trigger
-- existed (e.g. accounts signed up while the trigger was still missing).
-- Uses the same safe/unique username generation as handle_new_user().

do $$
declare
  u record;
  base text;
  candidate text;
  suffix int;
begin
  for u in
    select au.id, au.email
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    base := lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
    if length(base) < 3 then
      base := base || substr(replace(u.id::text, '-', ''), 1, 3 - length(base));
    end if;
    base := left(base, 32);

    candidate := base;
    suffix := 0;
    while exists (select 1 from public.profiles where username = candidate) loop
      suffix := suffix + 1;
      candidate := left(base, 32 - length(suffix::text) - 1) || '_' || suffix;
    end loop;

    insert into public.profiles (id, username, display_name)
    values (u.id, candidate, split_part(u.email, '@', 1))
    on conflict (id) do nothing;
  end loop;
end $$;
