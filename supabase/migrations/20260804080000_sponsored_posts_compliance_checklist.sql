-- Checklist ligjor-praktik për reklamat e sponsorizuara (Agora), veçanërisht
-- ato me video: konfirmim që admin/marketing-mod ka kontrolluar (1) të
-- drejtat mbi përmbajtjen (video/muzikë/imazhe), (2) mungesën e pretendimeve
-- të pavërtetuara, (3) që s'bie në një kategori të kufizuar (bixhoz, ilaçe,
-- financa/kripto, alkool/duhan, të mitur). Kjo s'është mbrojtje ligjore vetë
-- -- është regjistrim i dokumentuar i kujdesit të duhur (due diligence).
--
-- Zbatuar realisht, jo vetëm në UI: një reklamë s'mund të jetë is_active=true
-- pa i pasur të treja të konfirmuara -- e detyruar me CHECK constraint, që
-- s'mund të anashkalohet duke harruar diçka në formularin e klientit.

alter table public.sponsored_posts
  add column if not exists compliance_rights boolean not null default false,
  add column if not exists compliance_claims boolean not null default false,
  add column if not exists compliance_category boolean not null default false,
  add column if not exists compliance_checked_by uuid references public.profiles(id) on delete set null,
  add column if not exists compliance_checked_at timestamptz;

-- Grandfather: reklamat aktive ekzistuese (para këtij checklist-i) tashmë u
-- shqyrtuan manualisht dhe janë live sot -- nuk i rikualifikojmë prapaveprim,
-- thjesht i shënojmë të konfirmuara që constraint-i i ri të mos i thyejë.
update public.sponsored_posts
   set compliance_rights = true, compliance_claims = true, compliance_category = true
 where is_active = true;

alter table public.sponsored_posts drop constraint if exists sponsored_posts_compliance_before_active;
alter table public.sponsored_posts add constraint sponsored_posts_compliance_before_active
  check (not is_active or (compliance_rights and compliance_claims and compliance_category));
