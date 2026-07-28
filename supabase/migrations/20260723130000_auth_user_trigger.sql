-- Adds the missing trigger that creates a public.profiles row whenever a
-- new user signs up. public.handle_new_user() already existed in the
-- restored schema, but no trigger on auth.users ever called it, so every
-- signup left the account without a profiles row (breaking posting,
-- voting, commenting, following and profile editing via FK violations).
--
-- Also hardens username generation: split_part(email, '@', 1) alone can
-- violate profiles_username_check (lowercase [a-z0-9_]{3,32} only) for
-- emails with dots, uppercase letters, or short local parts, and can
-- collide with profiles_username_key (UNIQUE).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  if length(base) < 3 then
    base := base || substr(replace(new.id::text, '-', ''), 1, 3 - length(base));
  end if;
  base := left(base, 32);

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 32 - length(suffix::text) - 1) || '_' || suffix;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
