-- Bucket i dedikuar për median e Agora-s (foto/video të reklamave), i ndarë
-- nga "images" (postime normale) sepse këtu ngarkimi duhet i kufizuar vetëm
-- për admin global ose Marketing Moderator, jo për çdo përdorues të kyçur.

insert into storage.buckets (id, name, public)
values ('agora-media', 'agora-media', true)
on conflict (id) do nothing;

do $$
begin
  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'public_read_agora_media';
  if not found then
    create policy public_read_agora_media on storage.objects
      for select using (bucket_id = 'agora-media');
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'marketing_upload_agora_media';
  if not found then
    create policy marketing_upload_agora_media on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'agora-media'
        and (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()))
      );
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'marketing_update_agora_media';
  if not found then
    create policy marketing_update_agora_media on storage.objects
      for update to authenticated
      using (
        bucket_id = 'agora-media'
        and (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()))
      )
      with check (
        bucket_id = 'agora-media'
        and (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()))
      );
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'marketing_delete_agora_media';
  if not found then
    create policy marketing_delete_agora_media on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'agora-media'
        and (public.is_global_admin(auth.uid()) or public.is_marketing_mod(auth.uid()))
      );
  end if;
end $$;
