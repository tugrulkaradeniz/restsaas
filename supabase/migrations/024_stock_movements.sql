-- ============================================================
-- Stok Hareket Günlüğü — her stok değişikliğinin nedeni/zamanı
-- ============================================================

create table stock_movements (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  ingredient_id   uuid not null references ingredients(id) on delete cascade,
  type            text not null check (type in ('order','purchase','adjustment')),
  quantity_change decimal(10,3) not null,
  resulting_qty   decimal(10,3) not null,
  order_id        uuid references orders(id) on delete set null,
  entry_id        uuid references stock_entries(id) on delete set null,
  note            text,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index stock_movements_tenant_created on stock_movements (tenant_id, created_at desc);
create index stock_movements_ingredient on stock_movements (ingredient_id);

alter table stock_movements enable row level security;

create policy "stock_movements_tenant_read" on stock_movements
  for select using (tenant_id = get_tenant_id());

create policy "stock_movements_tenant_insert" on stock_movements
  for insert with check (tenant_id = get_tenant_id());
