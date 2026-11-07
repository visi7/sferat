-- Gjetje auditimi: zileja e njoftimeve (NotificationBell) lexonte numrin e
-- palexuara VETËM një herë, kur ngarkohej komponenti — nëse dikush të
-- komentonte/votonte/të ndiqte ndërsa ishe duke shfletuar sajtin, s'e
-- shihje derisa të rifreskoje vetë faqen. Kjo e aktivizon Supabase Realtime
-- mbi tabelën "notifications", që klienti (NotificationBell.tsx) të marrë
-- INSERT-et e reja të gjalla. RLS-ja ekzistuese (n_sel: auth.uid() =
-- user_id) siguron automatikisht që çdo abonim merr vetëm rreshtat e veta.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
