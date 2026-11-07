-- Bucket-et "avatars"/"images" s'kishin limit madhësie/lloji të konfiguruar
-- që prej krijimit (20260723170000_storage_buckets.sql) — çdo përdorues i
-- kyçur mund të ngarkonte skedar të çfarëdoshëm madhësie/lloji si "avatar"
-- apo "foto postimi". Mbrojtja në klient (lib/imageUpload.ts) tashmë u
-- shtua, por kjo është mbrojtja e vërtetë (dikush mund ta anashkalojë
-- klientin duke thirrur API-n direkt) — Postgres/Storage e refuzon vetë
-- ngarkimin nëse tejkalon limitin, pavarësisht nga kodi klientit.

update storage.buckets
set file_size_limit = 8388608, -- 8MB, njësoj si limiti i klientit
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
where id in ('avatars', 'images');
