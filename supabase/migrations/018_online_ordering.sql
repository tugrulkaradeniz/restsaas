-- ============================================================
-- 018: Online Ordering Platform
-- ============================================================

-- Mutfak/Yemek tipi etiketleri (super admin yönetir)
CREATE TABLE IF NOT EXISTS cuisine_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  emoji      text,
  sort_order int  NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cuisine_types (name, emoji, sort_order) VALUES
  ('Pizza',             '🍕', 1),
  ('Döner & Kebap',     '🥙', 2),
  ('Pide & Lahmacun',   '🫓', 3),
  ('Burger',            '🍔', 4),
  ('Deniz Ürünleri',    '🐟', 5),
  ('Kahvaltı',          '🥚', 6),
  ('Salata',            '🥗', 7),
  ('Tatlı & Pasta',     '🍰', 8),
  ('Çorba',             '🍲', 9),
  ('Makarna',           '🍝', 10),
  ('Türk Mutfağı',      '🍽️', 11),
  ('Vejeteryan',        '🌱', 12)
ON CONFLICT (name) DO NOTHING;

-- Restoran online sipariş ayarları
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS online_ordering_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cuisine_type_ids        uuid[]  NOT NULL DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lat                     numeric;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lng                     numeric;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone                   text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS online_order_hours      jsonb;
-- örnek: {"mon":{"open":"09:00","close":"22:00"},"tue":{"open":"09:00","close":"22:00"},...,"closed":[]}

-- Teslimat bölgeleri (her restoran birden fazla bölge tanımlayabilir)
CREATE TABLE IF NOT EXISTS delivery_zones (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               text    NOT NULL,
  max_distance_km    numeric NOT NULL,
  min_order_amount   numeric NOT NULL DEFAULT 0,
  delivery_fee       numeric NOT NULL DEFAULT 0,
  estimated_minutes  int     NOT NULL DEFAULT 30,
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         int     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_delivery_zones"      ON delivery_zones FOR ALL    USING (tenant_id = get_tenant_id());
CREATE POLICY "public_read_delivery_zones" ON delivery_zones FOR SELECT USING (true);

-- Ürün seçenek grupları (Boyut, Ekstra, Sos...)
CREATE TABLE IF NOT EXISTS item_option_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  is_required  boolean NOT NULL DEFAULT false,
  max_select   int     NOT NULL DEFAULT 1,
  sort_order   int     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE item_option_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_item_option_groups"      ON item_option_groups FOR ALL    USING (tenant_id = get_tenant_id());
CREATE POLICY "public_read_item_option_groups" ON item_option_groups FOR SELECT USING (true);

-- Seçenek değerleri (Küçük +0₺, Orta +10₺, Büyük +20₺...)
CREATE TABLE IF NOT EXISTS item_options (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid    NOT NULL REFERENCES item_option_groups(id) ON DELETE CASCADE,
  tenant_id   uuid    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  sort_order  int     NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE item_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_item_options"      ON item_options FOR ALL    USING (tenant_id = get_tenant_id());
CREATE POLICY "public_read_item_options" ON item_options FOR SELECT USING (true);

-- orders tablosuna online sipariş alanları
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name      text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone     text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email     text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address   text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat       numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng       numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type      text;        -- 'pickup' | 'delivery'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone_id   uuid REFERENCES delivery_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee       numeric NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_note         text;

-- order_items: seçilen opsiyonlar
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_options jsonb;   -- [{group_name,option_name,price_delta}]
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price       numeric;  -- birim fiyat (baz + delta)

-- Email OTP doğrulama
CREATE TABLE IF NOT EXISTS order_otps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  code       text NOT NULL,
  verified   boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Doğrulanmış müşteriler (bir kez doğrulama yeter)
CREATE TABLE IF NOT EXISTS verified_customers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone              text NOT NULL UNIQUE,
  email              text,
  name               text,
  verification_token text NOT NULL UNIQUE,
  first_verified_at  timestamptz NOT NULL DEFAULT now(),
  last_order_at      timestamptz
);

-- İndeksler
CREATE INDEX IF NOT EXISTS delivery_zones_tenant ON delivery_zones (tenant_id);
CREATE INDEX IF NOT EXISTS item_option_groups_item ON item_option_groups (menu_item_id);
CREATE INDEX IF NOT EXISTS item_options_group ON item_options (group_id);
CREATE INDEX IF NOT EXISTS order_otps_email_expires ON order_otps (email, expires_at);
CREATE INDEX IF NOT EXISTS verified_customers_phone ON verified_customers (phone);
CREATE INDEX IF NOT EXISTS orders_source ON orders (tenant_id, source, created_at DESC);
