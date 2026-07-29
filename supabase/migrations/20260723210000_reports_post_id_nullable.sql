-- reports.post_id was NOT NULL, but a comment-only report (post_id left
-- unset, only comment_id set) is a valid, intended case -- comment_id is
-- already nullable for the opposite case (post reports). Without this,
-- reporting a comment always fails with a not-null violation.

alter table public.reports alter column post_id drop not null;
