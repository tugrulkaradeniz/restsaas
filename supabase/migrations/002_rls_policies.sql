-- ============================================================
-- RLS Politikaları
-- JWT'den tenant_id çekilerek her tabloda izolasyon sağlanır
-- ============================================================

-- Yardımcı fonksiyon: JWT'den tenant_id al
create or replace function get_tenant_id()
returns uuid language sql stable as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

-- Yardımcı fonksiyon: JWT'den role al
create or replace function get_user_role()
returns text language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

-- ============================================================
-- TENANTS politikaları
-- ============================================================
create policy "tenant_select" on tenants
  for select using (id = get_tenant_id());

create policy "tenant_update_owner" on tenants
  for update using (
    id = get_tenant_id() and get_user_role() in ('owner','super_admin')
  );

-- ============================================================
-- USERS politikaları
-- ============================================================
create policy "users_select" on users
  for select using (tenant_id = get_tenant_id());

create policy "users_insert_owner" on users
  for insert with check (
    tenant_id = get_tenant_id() and get_user_role() in ('owner','super_admin')
  );

create policy "users_update_owner" on users
  for update using (
    tenant_id = get_tenant_id() and get_user_role() in ('owner','super_admin')
  );

create policy "users_delete_owner" on users
  for delete using (
    tenant_id = get_tenant_id() and get_user_role() in ('owner','super_admin')
  );

-- ============================================================
-- Jenerik tenant-based politikalar (floor_plans, tables, menu_*, orders, vb.)
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'floor_plans','tables',
    'menu_categories','menu_items',
    'orders','payments',
    'ingredients','suppliers',
    'expenses','customers',
    'reservations','shifts','reviews','campaigns'
  ]
  loop
    execute format(
      'create policy "%s_tenant_select" on %s for select using (tenant_id = get_tenant_id())',
      t, t
    );
    execute format(
      'create policy "%s_tenant_insert" on %s for insert with check (tenant_id = get_tenant_id())',
      t, t
    );
    execute format(
      'create policy "%s_tenant_update" on %s for update using (tenant_id = get_tenant_id())',
      t, t
    );
    execute format(
      'create policy "%s_tenant_delete" on %s for delete using (tenant_id = get_tenant_id())',
      t, t
    );
  end loop;
end
$$;

-- menu_item_allergens, recipes, order_items — tenant_id yok, parent üzerinden izole
-- Önceki jenerik politikaları kaldır, parent join politikası ekle
drop policy if exists "menu_item_allergens_tenant_select" on menu_item_allergens;
drop policy if exists "menu_item_allergens_tenant_insert" on menu_item_allergens;
drop policy if exists "menu_item_allergens_tenant_update" on menu_item_allergens;
drop policy if exists "menu_item_allergens_tenant_delete" on menu_item_allergens;

create policy "allergens_via_menu_item" on menu_item_allergens
  for all using (
    exists (
      select 1 from menu_items mi
      where mi.id = menu_item_id and mi.tenant_id = get_tenant_id()
    )
  );

drop policy if exists "recipes_tenant_select" on recipes;
drop policy if exists "recipes_tenant_insert" on recipes;
drop policy if exists "recipes_tenant_update" on recipes;
drop policy if exists "recipes_tenant_delete" on recipes;

create policy "recipes_via_menu_item" on recipes
  for all using (
    exists (
      select 1 from menu_items mi
      where mi.id = menu_item_id and mi.tenant_id = get_tenant_id()
    )
  );

drop policy if exists "order_items_tenant_select" on order_items;
drop policy if exists "order_items_tenant_insert" on order_items;
drop policy if exists "order_items_tenant_update" on order_items;
drop policy if exists "order_items_tenant_delete" on order_items;

create policy "order_items_via_order" on order_items
  for all using (
    exists (
      select 1 from orders o
      where o.id = order_id and o.tenant_id = get_tenant_id()
    )
  );

drop policy if exists "ingredient_suppliers_tenant_select" on ingredient_suppliers;
drop policy if exists "ingredient_suppliers_tenant_insert" on ingredient_suppliers;
drop policy if exists "ingredient_suppliers_tenant_update" on ingredient_suppliers;
drop policy if exists "ingredient_suppliers_tenant_delete" on ingredient_suppliers;

create policy "ingredient_suppliers_via_ingredient" on ingredient_suppliers
  for all using (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_id and i.tenant_id = get_tenant_id()
    )
  );

create policy "loyalty_transactions_via_customer" on loyalty_transactions
  for all using (
    exists (
      select 1 from customers c
      where c.id = customer_id and c.tenant_id = get_tenant_id()
    )
  );
