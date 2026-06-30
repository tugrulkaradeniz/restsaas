-- KDV artık fatura başlığında değil, her kalemde ayrı ayrı
alter table stock_entry_items
  add column kdv_rate     decimal(5,2)  not null default 18,
  add column kdv_included boolean       not null default false,
  add column kdv_amount   decimal(10,2) not null default 0;

-- Başlıktaki tekil kdv_rate'i kaldır (artık per-line)
alter table stock_entries drop column if exists kdv_rate;
