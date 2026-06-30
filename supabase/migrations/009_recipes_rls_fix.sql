-- recipes RLS'i insert için with check ekle
-- for all + only using = insert'te with check olmaz; ayrı politikalar yaz

drop policy if exists "recipes_via_menu_item" on recipes;

create policy "recipes_select" on recipes
  for select using (
    exists (
      select 1 from menu_items mi
      where mi.id = menu_item_id and mi.tenant_id = get_tenant_id()
    )
  );

create policy "recipes_insert" on recipes
  for insert with check (
    exists (
      select 1 from menu_items mi
      where mi.id = menu_item_id and mi.tenant_id = get_tenant_id()
    )
  );

create policy "recipes_update" on recipes
  for update using (
    exists (
      select 1 from menu_items mi
      where mi.id = menu_item_id and mi.tenant_id = get_tenant_id()
    )
  );

create policy "recipes_delete" on recipes
  for delete using (
    exists (
      select 1 from menu_items mi
      where mi.id = menu_item_id and mi.tenant_id = get_tenant_id()
    )
  );
