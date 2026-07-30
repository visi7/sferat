-- Lets a user hide their employment/education/location from other
-- visitors' view of their profile. Postgres RLS is row-level, not
-- column-level, so this can't be enforced as "the anon key literally
-- cannot read these columns" without a separate view/function layer —
-- it's an app-level display filter (the profile page blanks these
-- fields out for non-owners when the flag is set). Reasonable given
-- these are self-reported bio-style fields, not sensitive data like
-- email/payment info.

alter table public.profiles
  add column if not exists credentials_private boolean not null default false;
