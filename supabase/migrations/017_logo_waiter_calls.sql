-- İşletme logosu
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text;

-- Müşteri garson çağırma
CREATE TABLE IF NOT EXISTS waiter_calls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id   uuid NOT NULL REFERENCES tables(id)  ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending',  -- pending | answered
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;

-- Sadece tenant'ın personeli okuyabilir / güncelleyebilir
CREATE POLICY "tenant_staff_waiter_calls" ON waiter_calls
  FOR ALL USING (tenant_id = get_tenant_id());

-- Herkes INSERT yapabilir (QR menüden müşteri çağırır) — ayrı policy
CREATE POLICY "public_insert_waiter_calls" ON waiter_calls
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS waiter_calls_tenant_status
  ON waiter_calls (tenant_id, status, created_at DESC);

-- Supabase Storage: logos bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_logos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "auth_logos_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "auth_logos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
