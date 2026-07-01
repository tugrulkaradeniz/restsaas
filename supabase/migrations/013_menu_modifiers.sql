-- Kalori alanı
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories integer DEFAULT NULL;

-- Çıkarılabilir malzemeler (soğansız, sossuz vb.)
CREATE TABLE IF NOT EXISTS menu_item_removables (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  name      text NOT NULL
);

ALTER TABLE menu_item_removables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_removables" ON menu_item_removables
  FOR ALL
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Ekstra malzemeler (ekstra peynir +5₺ vb.)
CREATE TABLE IF NOT EXISTS menu_item_extras (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  name      text NOT NULL,
  price     numeric(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE menu_item_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_extras" ON menu_item_extras
  FOR ALL
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());
