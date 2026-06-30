-- ============================================================
-- Stok & Muhasebe — Fatura bazlı stok girişi
-- ============================================================

-- Alım faturası / fişi başlığı
create table stock_entries (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  supplier_id    uuid references suppliers(id) on delete set null,
  invoice_no     text,
  invoice_date   date not null default current_date,
  due_date       date,
  subtotal       decimal(10,2) not null default 0,
  kdv_rate       decimal(5,2)  not null default 18,
  kdv_amount     decimal(10,2) not null default 0,
  total_amount   decimal(10,2) not null default 0,
  paid_amount    decimal(10,2) not null default 0,
  payment_status text not null default 'pending'
                   check (payment_status in ('pending','partial','paid')),
  notes          text,
  created_at     timestamptz not null default now()
);

-- Fatura kalemleri
create table stock_entry_items (
  id            uuid primary key default uuid_generate_v4(),
  entry_id      uuid not null references stock_entries(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  quantity      decimal(10,3) not null check (quantity > 0),
  unit_cost     decimal(10,2) not null check (unit_cost >= 0),
  total         decimal(10,2) not null
);

-- Ödemeler (kısmi ödeme desteği)
create table stock_payments (
  id         uuid primary key default uuid_generate_v4(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  entry_id   uuid not null references stock_entries(id) on delete cascade,
  amount     decimal(10,2) not null check (amount > 0),
  method     text not null check (method in ('cash','bank','card','check')),
  paid_at    date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

alter table stock_entries      enable row level security;
alter table stock_entry_items  enable row level security;
alter table stock_payments     enable row level security;

create policy "stock_entries_tenant" on stock_entries
  for all using (tenant_id = get_tenant_id());

create policy "stock_entry_items_via_entry" on stock_entry_items
  for all using (
    exists (
      select 1 from stock_entries e
      where e.id = entry_id and e.tenant_id = get_tenant_id()
    )
  );

create policy "stock_payments_tenant" on stock_payments
  for all using (tenant_id = get_tenant_id());
