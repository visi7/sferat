-- Shto mundësinë e raportimit direkt të një përdoruesi (jo vetëm post/koment),
-- për menynë e re "⋮" tek profili ("Report user").
--
-- Nuk nevojiten ndryshime në RLS: policy-t ekzistuese
-- reports_select_self_or_mod / reports_update_mod (shih 20260730000000) kanë
-- tashmë degë të pakushtëzuara is_global_reviewer(auth.uid()) /
-- is_global_mod(auth.uid()) që u japin admin/director/manager/moderator/
-- assistant (global) qasje pavarësisht përmbajtjes së rreshtit -- pra do të
-- shohin dhe zgjidhin edhe raportet e reja reported_user_id-only pa asnjë
-- shtesë. Policy-t e insert-it (auth.uid() = reporter_id, pa kufizim kolone)
-- lejojnë tashmë çdo lloj raporti të ri.

alter table public.reports
  add column if not exists reported_user_id uuid references public.profiles(id) on delete cascade;

alter table public.reports
  add constraint reports_not_self_report
  check (reported_user_id is null or reported_user_id <> reporter_id);

create index if not exists reports_reported_user_id_idx
  on public.reports (reported_user_id)
  where reported_user_id is not null;
