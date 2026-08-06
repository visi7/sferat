-- Gjetje auditimi: "notifications" ka RLS të aktivizuar me VETËM select
-- (n_sel) dhe update (n_upd) -- asnjëherë s'ka pasur politikë DELETE, që kur
-- u krijua tabela (20251026235610_extras_core.sql). Kur RLS refuzon një
-- DELETE, Postgres s'jep gabim -- thjesht fshin 0 rreshta dhe kthen sukses,
-- kështu që klienti (deleteOne/clearAll te notifications/page.tsx dhe
-- NotificationBell.tsx), i cili kontrollon vetëm `if (!error)`, e hiqte
-- njoftimin nga gjendja lokale duke besuar se u fshi -- por rreshti mbetej
-- real në DB dhe rishfaqej pas rifreskimit të faqes.
create policy notifications_delete_own on public.notifications
  for delete using (auth.uid() = user_id);
