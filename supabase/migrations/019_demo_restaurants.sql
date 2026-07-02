-- ============================================================
-- 019: Demo Restaurants — Lezzet Kebap & Pizza Mondo
-- ============================================================
-- Bu migration 2 demo restoran oluşturur.
-- Giriş için her restoran için ayrıca /register üzerinden
-- kullanıcı oluşturmanız gerekir (slug'ı kendiniz yazın).
-- ============================================================

DO $$
DECLARE
  -- Sabit UUID'ler (her çalıştırmada aynı kalsın)
  t1 uuid := 'a1b2c3d4-0001-0001-0001-000000000001'::uuid;
  t2 uuid := 'a1b2c3d4-0002-0002-0002-000000000002'::uuid;

  -- Cuisine type IDs
  cid_kebap   uuid;
  cid_turk    uuid;
  cid_pizza   uuid;
  cid_makarna uuid;

  -- Category IDs - Lezzet Kebap
  lk_cat_corba  uuid := gen_random_uuid();
  lk_cat_ana    uuid := gen_random_uuid();
  lk_cat_meze   uuid := gen_random_uuid();
  lk_cat_icecek uuid := gen_random_uuid();

  -- Category IDs - Pizza Mondo
  pm_cat_pizza   uuid := gen_random_uuid();
  pm_cat_makarna uuid := gen_random_uuid();
  pm_cat_tatli   uuid := gen_random_uuid();
  pm_cat_icecek  uuid := gen_random_uuid();

  -- Menu item IDs - Lezzet Kebap
  lk_adana    uuid := gen_random_uuid();
  lk_urfa     uuid := gen_random_uuid();
  lk_tavuk    uuid := gen_random_uuid();
  lk_karisik  uuid := gen_random_uuid();
  lk_mercimek uuid := gen_random_uuid();
  lk_domates  uuid := gen_random_uuid();
  lk_icli     uuid := gen_random_uuid();
  lk_cacik    uuid := gen_random_uuid();
  lk_ayran    uuid := gen_random_uuid();
  lk_salgam   uuid := gen_random_uuid();
  lk_su       uuid := gen_random_uuid();

  -- Menu item IDs - Pizza Mondo
  pm_margerita uuid := gen_random_uuid();
  pm_pepperoni uuid := gen_random_uuid();
  pm_bbq       uuid := gen_random_uuid();
  pm_cheese    uuid := gen_random_uuid();
  pm_spaghetti uuid := gen_random_uuid();
  pm_fettuccine uuid := gen_random_uuid();
  pm_tiramisu  uuid := gen_random_uuid();
  pm_lava      uuid := gen_random_uuid();
  pm_cola      uuid := gen_random_uuid();
  pm_ayran     uuid := gen_random_uuid();
  pm_limonata  uuid := gen_random_uuid();

  -- Option group IDs
  og_porsiyon  uuid := gen_random_uuid();
  og_ekstra    uuid := gen_random_uuid();
  og_pizza_boy uuid := gen_random_uuid();
  og_pizza_hamur uuid := gen_random_uuid();
  og_pizza_extra uuid := gen_random_uuid();

  -- Online order hours (her gün 09:00-22:00)
  hours jsonb := '{"mon":{"open":"09:00","close":"22:00"},"tue":{"open":"09:00","close":"22:00"},"wed":{"open":"09:00","close":"22:00"},"thu":{"open":"09:00","close":"22:00"},"fri":{"open":"09:00","close":"23:00"},"sat":{"open":"10:00","close":"23:00"},"sun":{"open":"11:00","close":"22:00"}}'::jsonb;

BEGIN
  -- Cuisine type ID'lerini al
  SELECT id INTO cid_kebap   FROM cuisine_types WHERE name = 'Döner & Kebap';
  SELECT id INTO cid_turk    FROM cuisine_types WHERE name = 'Türk Mutfağı';
  SELECT id INTO cid_pizza   FROM cuisine_types WHERE name = 'Pizza';
  SELECT id INTO cid_makarna FROM cuisine_types WHERE name = 'Makarna';

  -- ============================================================
  -- RESTORAN 1: Lezzet Kebap (Kadıköy, İstanbul)
  -- ============================================================
  INSERT INTO tenants (
    id, slug, name, plan,
    online_ordering_enabled,
    cuisine_type_ids,
    lat, lng,
    address, phone,
    online_order_hours,
    loyalty_enabled, loyalty_rate, loyalty_redeem_rate,
    created_at
  ) VALUES (
    t1, 'lezzet-kebap', 'Lezzet Kebap', 'pro',
    true,
    ARRAY[cid_kebap, cid_turk]::uuid[],
    40.9833, 29.0333,
    'Moda Cad. No:42, Kadıköy / İstanbul', '0216 345 67 89',
    hours,
    false, 1, 1,
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    online_ordering_enabled = true,
    cuisine_type_ids = ARRAY[cid_kebap, cid_turk]::uuid[],
    lat = 40.9833, lng = 29.0333;

  -- Delivery zones — Lezzet Kebap
  INSERT INTO delivery_zones (tenant_id, name, max_distance_km, min_order_amount, delivery_fee, estimated_minutes, sort_order)
  VALUES
    (t1, 'Yakın Çevre (0-3 km)',  3,  80,  15, 25, 0),
    (t1, 'Orta Mesafe (3-6 km)',  6, 150,  25, 40, 1),
    (t1, 'Uzak Semt (6-10 km)', 10, 300,  40, 60, 2)
  ON CONFLICT DO NOTHING;

  -- Kategoriler — Lezzet Kebap
  INSERT INTO menu_categories (id, tenant_id, name, sort_order, is_active) VALUES
    (lk_cat_corba,  t1, 'Çorbalar',   1, true),
    (lk_cat_ana,    t1, 'Ana Yemekler', 2, true),
    (lk_cat_meze,   t1, 'Mezeler',    3, true),
    (lk_cat_icecek, t1, 'İçecekler',  4, true)
  ON CONFLICT (id) DO NOTHING;

  -- Menü — Lezzet Kebap
  INSERT INTO menu_items (id, tenant_id, category_id, name, price, description_public, is_available, is_visible_selfservis, kdv_rate, kdv_included) VALUES
    -- Çorbalar
    (lk_mercimek, t1, lk_cat_corba, 'Mercimek Çorbası',  55, 'Kırmızı mercimek, tereyağı, tatlı kırmızıbiber ile.', true, true, 10, true),
    (lk_domates,  t1, lk_cat_corba, 'Domates Çorbası',   45, 'Taze domates püresi, krema ile zenginleştirilmiş.', true, true, 10, true),
    -- Ana Yemekler
    (lk_adana,    t1, lk_cat_ana, 'Adana Kebap',        135, 'Acılı dana kıyma, közde pişirilmiş. Lavaş, domates, biber ile.', true, true, 10, true),
    (lk_urfa,     t1, lk_cat_ana, 'Urfa Kebap',         130, 'Hafif baharatlı dana kıyma, nar ekşili sos ile.', true, true, 10, true),
    (lk_tavuk,    t1, lk_cat_ana, 'Tavuk Şiş',         115, 'Marine edilmiş tavuk but, közde pişirilmiş. Pilav ile.', true, true, 10, true),
    (lk_karisik,  t1, lk_cat_ana, 'Karışık Izgara',    220, 'Adana, urfa, tavuk şiş, kaburga. Garnitür dahil.', true, true, 10, true),
    -- Mezeler
    (lk_icli,     t1, lk_cat_meze, 'İçli Köfte',         70, 'Bulgur hamurundan yapılmış, iç harçlı geleneksel köfte (6 adet).', true, true, 10, true),
    (lk_cacik,    t1, lk_cat_meze, 'Cacık',              40, 'Yoğurt, salatalık, sarımsak, taze nane.', true, true, 10, true),
    -- İçecekler
    (lk_ayran,    t1, lk_cat_icecek, 'Ayran',            20, 'Köpüklü, taze çırpılmış.', true, true, 10, true),
    (lk_salgam,   t1, lk_cat_icecek, 'Şalgam Suyu',      20, 'Acılı veya acısız.', true, true, 10, true),
    (lk_su,       t1, lk_cat_icecek, 'Su (500ml)',        10, null, true, true, 10, true)
  ON CONFLICT (id) DO NOTHING;

  -- Seçenek Grubu: Adana Kebap — Porsiyon
  INSERT INTO item_option_groups (id, menu_item_id, tenant_id, name, is_required, max_select, sort_order) VALUES
    (og_porsiyon, lk_adana, t1, 'Porsiyon', true, 1, 0)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO item_options (group_id, tenant_id, name, price_delta, sort_order) VALUES
    (og_porsiyon, t1, 'Tek Porsiyon',   0, 0),
    (og_porsiyon, t1, 'Çift Porsiyon', 90, 1)
  ON CONFLICT DO NOTHING;

  -- Seçenek Grubu: Adana Kebap — Ekstra
  INSERT INTO item_option_groups (id, menu_item_id, tenant_id, name, is_required, max_select, sort_order) VALUES
    (og_ekstra, lk_adana, t1, 'Ekstra', false, 3, 1)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO item_options (group_id, tenant_id, name, price_delta, sort_order) VALUES
    (og_ekstra, t1, 'Turşu',          0, 0),
    (og_ekstra, t1, 'Ekstra Soğan',   0, 1),
    (og_ekstra, t1, 'Ekstra Salata', 15, 2),
    (og_ekstra, t1, 'Ekstra Lavaş',  10, 3)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- RESTORAN 2: Pizza Mondo (Beşiktaş, İstanbul)
  -- ============================================================
  INSERT INTO tenants (
    id, slug, name, plan,
    online_ordering_enabled,
    cuisine_type_ids,
    lat, lng,
    address, phone,
    online_order_hours,
    loyalty_enabled, loyalty_rate, loyalty_redeem_rate,
    created_at
  ) VALUES (
    t2, 'pizza-mondo', 'Pizza Mondo', 'pro',
    true,
    ARRAY[cid_pizza, cid_makarna]::uuid[],
    41.0433, 29.0033,
    'Barbaros Bulvarı No:15, Beşiktaş / İstanbul', '0212 456 78 90',
    hours,
    false, 1, 1,
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    online_ordering_enabled = true,
    cuisine_type_ids = ARRAY[cid_pizza, cid_makarna]::uuid[],
    lat = 41.0433, lng = 29.0033;

  -- Delivery zones — Pizza Mondo
  INSERT INTO delivery_zones (tenant_id, name, max_distance_km, min_order_amount, delivery_fee, estimated_minutes, sort_order)
  VALUES
    (t2, 'Yakın (0-4 km)',    4, 120,  20, 30, 0),
    (t2, 'Orta (4-8 km)',     8, 250,  35, 45, 1),
    (t2, 'Uzak (8-12 km)',   12, 450,  55, 65, 2)
  ON CONFLICT DO NOTHING;

  -- Kategoriler — Pizza Mondo
  INSERT INTO menu_categories (id, tenant_id, name, sort_order, is_active) VALUES
    (pm_cat_pizza,   t2, 'Pizzalar',  1, true),
    (pm_cat_makarna, t2, 'Makarnar',  2, true),
    (pm_cat_tatli,   t2, 'Tatlılar',  3, true),
    (pm_cat_icecek,  t2, 'İçecekler', 4, true)
  ON CONFLICT (id) DO NOTHING;

  -- Menü — Pizza Mondo
  INSERT INTO menu_items (id, tenant_id, category_id, name, price, description_public, is_available, is_visible_selfservis, kdv_rate, kdv_included) VALUES
    -- Pizzalar
    (pm_margerita, t2, pm_cat_pizza, 'Margherita',       160, 'Domates sosu, mozzarella, fesleğen. Klasik İtalyan.', true, true, 10, true),
    (pm_pepperoni, t2, pm_cat_pizza, 'Pepperoni',         195, 'Bol pepperoni, mozzarella, domates sosu.', true, true, 10, true),
    (pm_bbq,       t2, pm_cat_pizza, 'BBQ Chicken',       205, 'Izgara tavuk, BBQ sos, soğan, mozzarella.', true, true, 10, true),
    (pm_cheese,    t2, pm_cat_pizza, 'Dört Peynir',       190, 'Mozzarella, cheddar, parmesan, rokfor.', true, true, 10, true),
    -- Makarnar
    (pm_spaghetti, t2, pm_cat_makarna, 'Spaghetti Bolognese', 145, 'Dana kıyma, domates sosu, parmesan rendesi.', true, true, 10, true),
    (pm_fettuccine, t2, pm_cat_makarna, 'Fettuccine Alfredo', 140, 'Krema sosu, parmesan, tavuk parçaları.', true, true, 10, true),
    -- Tatlılar
    (pm_tiramisu, t2, pm_cat_tatli, 'Tiramisu',           95, 'Mascarpone, espresso, kakao. El yapımı.', true, true, 10, true),
    (pm_lava,     t2, pm_cat_tatli, 'Çikolatalı Lava Kek', 100, 'Sıcak çikolata dolgulu, dondurma ile.', true, true, 10, true),
    -- İçecekler
    (pm_cola,     t2, pm_cat_icecek, 'Kola (330ml)',       35, null, true, true, 10, true),
    (pm_ayran,    t2, pm_cat_icecek, 'Ayran',              25, null, true, true, 10, true),
    (pm_limonata, t2, pm_cat_icecek, 'Taze Limonata',      45, 'Taze sıkılmış, nane ile.', true, true, 10, true)
  ON CONFLICT (id) DO NOTHING;

  -- Seçenek Grubu: Pizzalar — Boyut (Margherita için örnek, diğerleri de benzer)
  INSERT INTO item_option_groups (id, menu_item_id, tenant_id, name, is_required, max_select, sort_order) VALUES
    (og_pizza_boy, pm_margerita, t2, 'Boyut', true, 1, 0)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO item_options (group_id, tenant_id, name, price_delta, sort_order) VALUES
    (og_pizza_boy, t2, '22 cm (Küçük)',    0,   0),
    (og_pizza_boy, t2, '32 cm (Orta)',    60,   1),
    (og_pizza_boy, t2, '45 cm (Büyük)',  120,   2)
  ON CONFLICT DO NOTHING;

  -- Seçenek Grubu: Margherita — Hamur
  INSERT INTO item_option_groups (id, menu_item_id, tenant_id, name, is_required, max_select, sort_order) VALUES
    (og_pizza_hamur, pm_margerita, t2, 'Hamur', false, 1, 1)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO item_options (group_id, tenant_id, name, price_delta, sort_order) VALUES
    (og_pizza_hamur, t2, 'Normal Hamur', 0, 0),
    (og_pizza_hamur, t2, 'İnce Hamur',  0, 1),
    (og_pizza_hamur, t2, 'Kalın Hamur', 0, 2)
  ON CONFLICT DO NOTHING;

  -- Seçenek Grubu: Margherita — Ekstra Malzeme
  INSERT INTO item_option_groups (id, menu_item_id, tenant_id, name, is_required, max_select, sort_order) VALUES
    (og_pizza_extra, pm_margerita, t2, 'Ekstra Malzeme', false, 4, 2)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO item_options (group_id, tenant_id, name, price_delta, sort_order) VALUES
    (og_pizza_extra, t2, 'Ekstra Mozzarella', 25, 0),
    (og_pizza_extra, t2, 'Mantar',            20, 1),
    (og_pizza_extra, t2, 'Sucuk',             30, 2),
    (og_pizza_extra, t2, 'Jalapeno',          15, 3),
    (og_pizza_extra, t2, 'Zeytin',            15, 4)
  ON CONFLICT DO NOTHING;

END $$;
