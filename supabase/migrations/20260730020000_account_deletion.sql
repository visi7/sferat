-- "Delete account" = anonymize (not cascade-delete), so other people's
-- conversations aren't broken. posts.author_id / comments.author_id both
-- ON DELETE CASCADE from profiles, and profiles ON DELETE CASCADE from
-- auth.users — so actually deleting the row would silently wipe every
-- post/comment the user ever made. Instead: the client scrubs its own
-- profiles row (username/display_name/avatar_url/bio/etc.) via the
-- existing profiles_update_self policy, and a server-side route bans the
-- auth user (via service_role) so they can never sign back in. No new
-- RLS needed — self-update already covers the anonymization write.

alter table public.profiles
  add column if not exists deleted_at timestamptz;
