-- Creates the "avatars" and "images" storage buckets (never created when
-- the database schema was restored on the new Supabase project — only
-- public/auth schema objects were migrated, not Storage), plus RLS
-- policies so authenticated users can upload and everyone can view.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('images', 'images', true)
on conflict (id) do nothing;

do $$
begin
  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'public_read_avatars';
  if not found then
    create policy public_read_avatars on storage.objects
      for select using (bucket_id = 'avatars');
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'public_read_images';
  if not found then
    create policy public_read_images on storage.objects
      for select using (bucket_id = 'images');
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'auth_upload_avatars';
  if not found then
    create policy auth_upload_avatars on storage.objects
      for insert to authenticated with check (bucket_id = 'avatars');
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'auth_upload_images';
  if not found then
    create policy auth_upload_images on storage.objects
      for insert to authenticated with check (bucket_id = 'images');
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'owner_update_avatars';
  if not found then
    create policy owner_update_avatars on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and owner = auth.uid())
      with check (bucket_id = 'avatars' and owner = auth.uid());
  end if;

  perform 1 from pg_policies where schemaname = 'storage' and policyname = 'owner_update_images';
  if not found then
    create policy owner_update_images on storage.objects
      for update to authenticated
      using (bucket_id = 'images' and owner = auth.uid())
      with check (bucket_id = 'images' and owner = auth.uid());
  end if;
end $$;
