-- Supabase Storage: menu-images bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Herkes okuyabilir (public bucket)
drop policy if exists "menu_images_public_select" on storage.objects;
create policy "menu_images_public_select"
  on storage.objects for select
  using (bucket_id = 'menu-images');

-- Sadece oturum açmış tenant kullanıcıları kendi klasörlerine yükleyebilir
-- Dosya yolu: {tenant_id}/{filename}
drop policy if exists "menu_images_tenant_insert" on storage.objects;
create policy "menu_images_tenant_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

drop policy if exists "menu_images_tenant_delete" on storage.objects;
create policy "menu_images_tenant_delete"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );
