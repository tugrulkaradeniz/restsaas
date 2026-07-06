-- Müşteri profili: sipariş geçmişi + kayıtlı adresler
alter table orders add column if not exists verified_customer_id uuid references verified_customers(id);

create table if not exists customer_addresses (
  id                   uuid primary key default gen_random_uuid(),
  verified_customer_id uuid not null references verified_customers(id) on delete cascade,
  label                text not null default 'Adres',
  address              text not null,
  lat                  numeric,
  lng                  numeric,
  is_default           boolean not null default false,
  created_at           timestamptz not null default now()
);
create index if not exists customer_addresses_vc on customer_addresses (verified_customer_id);

-- verified_customers ve order_otps'te hiç RLS yoktu (018'den beri) — anon key ile herkes
-- başka bir müşterinin verification_token'ını okuyup kimliğine bürünebiliyordu.
-- Bu üç tabloya artık sadece server (service role, API route'lar) erişebilir.
alter table customer_addresses enable row level security;
alter table verified_customers  enable row level security;
alter table order_otps          enable row level security;
