-- ============================================================
-- Restoran SaaS — İlk Şema (v1.0)
-- ============================================================

-- UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
create table tenants (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text unique not null,
  name                text not null,
  plan                text not null default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  stripe_customer_id  text,
  trial_ends_at       timestamptz,
  loyalty_enabled     boolean not null default false,
  loyalty_rate        decimal(10,2) not null default 10,   -- kaç TL = 1 puan
  loyalty_redeem_rate decimal(10,2) not null default 0.1,  -- 1 puan = kaç TL
  printer_model       text,
  printer_ip          text,
  created_at          timestamptz not null default now()
);

alter table tenants enable row level security;

-- ============================================================
-- USERS
-- ============================================================
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role        text not null default 'waiter'
                check (role in ('super_admin','owner','manager','cashier','waiter','kitchen')),
  full_name   text not null,
  created_at  timestamptz not null default now()
);

alter table users enable row level security;

-- ============================================================
-- FLOOR PLANS & TABLES
-- ============================================================
create table floor_plans (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null default 'Ana Salon',
  layout      jsonb not null default '{"tables":[],"walls":[]}'::jsonb
);

alter table floor_plans enable row level security;

create table tables (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  capacity    integer not null default 4,
  status      text not null default 'empty'
                check (status in ('empty','occupied','reserved','dirty')),
  qr_token    text unique not null default encode(gen_random_bytes(16), 'hex')
);

alter table tables enable row level security;

-- ============================================================
-- MENU
-- ============================================================
create table menu_categories (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

alter table menu_categories enable row level security;

create table menu_items (
  id                      uuid primary key default uuid_generate_v4(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  category_id             uuid not null references menu_categories(id) on delete restrict,
  name                    text not null,
  price                   decimal(10,2) not null,
  cost                    decimal(10,2),
  image_url               text,
  description_internal    text,
  description_public      text,
  is_available            boolean not null default true,
  is_visible_selfservis   boolean not null default true,
  created_at              timestamptz not null default now()
);

alter table menu_items enable row level security;

create table menu_item_allergens (
  id            uuid primary key default uuid_generate_v4(),
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  allergen      text not null
);

alter table menu_item_allergens enable row level security;

-- ============================================================
-- ORDERS
-- ============================================================
create table orders (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  table_id            uuid references tables(id) on delete set null,
  waiter_id           uuid references users(id) on delete set null,
  source              text not null default 'waiter'
                        check (source in ('waiter','qr','online')),
  status              text not null default 'pending'
                        check (status in ('pending','confirmed','preparing','ready','delivered','paid','cancelled')),
  total_amount        decimal(10,2) not null default 0,
  discount_amount     decimal(10,2) not null default 0,
  points_used         integer not null default 0,
  customer_phone      text,
  customer_location   jsonb,
  created_at          timestamptz not null default now()
);

alter table orders enable row level security;

create table order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references orders(id) on delete cascade,
  menu_item_id  uuid not null references menu_items(id) on delete restrict,
  quantity      integer not null default 1,
  unit_price    decimal(10,2) not null,
  note          text,
  status        text not null default 'pending'
                  check (status in ('pending','preparing','ready','cancelled'))
);

alter table order_items enable row level security;

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  method      text not null check (method in ('cash','card','online','points')),
  amount      decimal(10,2) not null,
  status      text not null default 'pending' check (status in ('pending','completed','refunded')),
  reference   text
);

alter table payments enable row level security;

-- ============================================================
-- STOCK & COST
-- ============================================================
create table ingredients (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  unit        text not null default 'adet',
  stock_qty   decimal(10,3) not null default 0,
  min_stock   decimal(10,3) not null default 0,
  unit_cost   decimal(10,2) not null default 0
);

alter table ingredients enable row level security;

create table recipes (
  id              uuid primary key default uuid_generate_v4(),
  menu_item_id    uuid not null references menu_items(id) on delete cascade,
  ingredient_id   uuid not null references ingredients(id) on delete restrict,
  quantity        decimal(10,3) not null,
  waste_percent   decimal(5,2) not null default 0,
  unique(menu_item_id, ingredient_id)
);

alter table recipes enable row level security;

-- ============================================================
-- SUPPLIERS
-- ============================================================
create table suppliers (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  contact     text,
  email       text,
  phone       text,
  note        text
);

alter table suppliers enable row level security;

create table ingredient_suppliers (
  id              uuid primary key default uuid_generate_v4(),
  ingredient_id   uuid not null references ingredients(id) on delete cascade,
  supplier_id     uuid not null references suppliers(id) on delete cascade,
  unit_price      decimal(10,2),
  last_order_date date
);

alter table ingredient_suppliers enable row level security;

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category    text not null check (category in ('rent','electricity','water','staff','other')),
  amount      decimal(10,2) not null,
  description text,
  date        date not null default current_date
);

alter table expenses enable row level security;

-- ============================================================
-- CUSTOMERS & LOYALTY
-- ============================================================
create table customers (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  phone           text not null,
  full_name       text not null,
  points_balance  integer not null default 0,
  created_at      timestamptz not null default now(),
  unique(tenant_id, phone)
);

alter table customers enable row level security;

create table loyalty_transactions (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id    uuid references orders(id) on delete set null,
  type        text not null check (type in ('earn','redeem')),
  points      integer not null,
  note        text,
  created_at  timestamptz not null default now()
);

alter table loyalty_transactions enable row level security;

-- ============================================================
-- RESERVATIONS
-- ============================================================
create table reservations (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  table_id        uuid references tables(id) on delete set null,
  customer_name   text not null,
  customer_phone  text not null,
  party_size      integer not null default 2,
  date            date not null,
  time            time not null,
  note            text,
  status          text not null default 'pending'
                    check (status in ('pending','confirmed','cancelled','completed')),
  created_at      timestamptz not null default now()
);

alter table reservations enable row level security;

-- ============================================================
-- SHIFTS
-- ============================================================
create table shifts (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  user_id       uuid not null references users(id) on delete restrict,
  start_time    timestamptz not null default now(),
  end_time      timestamptz,
  opening_cash  decimal(10,2) not null default 0,
  closing_cash  decimal(10,2),
  note          text
);

alter table shifts enable row level security;

-- ============================================================
-- REVIEWS
-- ============================================================
create table reviews (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  order_id      uuid references orders(id) on delete set null,
  menu_item_id  uuid references menu_items(id) on delete set null,
  customer_id   uuid references customers(id) on delete set null,
  rating        integer not null check (rating between 1 and 5),
  note          text,
  created_at    timestamptz not null default now()
);

alter table reviews enable row level security;

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table campaigns (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  name              text not null,
  type              text not null check (type in ('percent','fixed','free_item','happy_hour')),
  value             decimal(10,2) not null default 0,
  min_order_amount  decimal(10,2),
  free_item_id      uuid references menu_items(id) on delete set null,
  start_time        time,
  end_time          time,
  valid_from        date,
  valid_to          date,
  is_active         boolean not null default true
);

alter table campaigns enable row level security;
