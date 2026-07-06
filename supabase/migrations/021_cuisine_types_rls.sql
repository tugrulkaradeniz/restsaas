-- cuisine_types RLS eksikti (018'de tablo oluşturulmuş ama policy yoktu) —
-- herkes okuyabilsin (marketplace, ayarlar), sadece super_admin yazabilsin
alter table cuisine_types enable row level security;

drop policy if exists "cuisine_types_select" on cuisine_types;
create policy "cuisine_types_select" on cuisine_types
  for select using (true);

drop policy if exists "cuisine_types_insert_admin" on cuisine_types;
create policy "cuisine_types_insert_admin" on cuisine_types
  for insert with check (get_user_role() = 'super_admin');

drop policy if exists "cuisine_types_update_admin" on cuisine_types;
create policy "cuisine_types_update_admin" on cuisine_types
  for update using (get_user_role() = 'super_admin');

drop policy if exists "cuisine_types_delete_admin" on cuisine_types;
create policy "cuisine_types_delete_admin" on cuisine_types
  for delete using (get_user_role() = 'super_admin');
