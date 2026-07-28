-- profiles.username has no NOT NULL constraint (only a format CHECK, which
-- Postgres skips for NULLs), so any profile created before handle_new_user()
-- existed with a null/blank username slipped through. Backfills those using
-- the same safe/unique generation logic as the signup trigger.

do $$
declare
  r record;
  base text;
  candidate text;
  suffix int;
begin
  for r in
    select p.id, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.username is null or btrim(p.username) = ''
  loop
    base := lower(regexp_replace(split_part(r.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
    if length(base) < 3 then
      base := base || substr(replace(r.id::text, '-', ''), 1, 3 - length(base));
    end if;
    base := left(base, 32);

    candidate := base;
    suffix := 0;
    while exists (select 1 from public.profiles where username = candidate) loop
      suffix := suffix + 1;
      candidate := left(base, 32 - length(suffix::text) - 1) || '_' || suffix;
    end loop;

    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;
