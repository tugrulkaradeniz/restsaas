-- Mevcut type check kısıtlamasını güncelle
alter table campaigns drop constraint if exists campaigns_type_check;
alter table campaigns add constraint campaigns_type_check
  check (type in ('happy_hour','bundle','bogo','category','order_discount'));

-- Eksik kolonları ekle
alter table campaigns
  add column if not exists description   text,
  add column if not exists discount_type text check (discount_type in ('percent','fixed')),
  add column if not exists bundle_price  decimal(10,2),
  add column if not exists days_of_week  integer[],
  add column if not exists created_at    timestamptz not null default now();

-- Mevcut value kolonu discount_value görevi görüyor (kalsın)
-- start_time / end_time / valid_from / valid_to kolonları zaten mevcut

-- RLS politikası (mevcut değilse ekle)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'campaigns' and policyname = 'campaigns_tenant'
  ) then
    execute 'create policy "campaigns_tenant" on campaigns for all using (tenant_id = get_tenant_id()) with check (tenant_id = get_tenant_id())';
  end if;
end $$;

-- Kampanya kalemleri (bundle ürünleri, happy_hour hedef ürünler, bogo ürünleri, kategori)
create table if not exists campaign_items (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  item_type      text not null default 'product' check (item_type in ('product','category')),
  menu_item_id   uuid references menu_items(id) on delete cascade,
  category_id    uuid references menu_categories(id) on delete cascade,
  quantity       integer not null default 1,
  role           text not null default 'main' check (role in ('main','free','bundled'))
);

alter table campaign_items enable row level security;

create policy "campaign_items_via_campaign" on campaign_items
  for all using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.tenant_id = get_tenant_id())
  )
  with check (
    exists (select 1 from campaigns c where c.id = campaign_id and c.tenant_id = get_tenant_id())
  );
