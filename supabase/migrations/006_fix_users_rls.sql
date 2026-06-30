-- Kullanıcıların kendi profillerini her zaman görebilmesini sağlar
-- JWT'de app_metadata.tenant_id olmasa bile (eski kayıtlar, refresh sorunları) kendi satırını görebilir
create policy "users_select_own" on users
  for select using (id = auth.uid());
