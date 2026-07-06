-- İkram (bedelsiz ürün) desteği
alter table order_items
  add column if not exists is_complimentary boolean not null default false;
