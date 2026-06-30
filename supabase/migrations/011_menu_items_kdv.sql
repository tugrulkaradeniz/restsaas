alter table menu_items
  add column if not exists kdv_rate     decimal(5,2) not null default 10,
  add column if not exists kdv_included boolean      not null default true;
