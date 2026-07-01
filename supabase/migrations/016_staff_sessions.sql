CREATE TABLE IF NOT EXISTS staff_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  session_start  timestamptz NOT NULL DEFAULT now(),
  session_end    timestamptz,
  active_seconds int  NOT NULL DEFAULT 0,
  away_seconds   int  NOT NULL DEFAULT 0,
  away_count     int  NOT NULL DEFAULT 0,
  last_sync      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

-- Her kullanıcı kendi session'larını yönetebilir
CREATE POLICY "own_sessions" ON staff_sessions
  FOR ALL USING (user_id = auth.uid());

-- Sahip / müdür kendi tenant'ın tüm session'larını okuyabilir
CREATE POLICY "manager_read_sessions" ON staff_sessions
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE INDEX IF NOT EXISTS staff_sessions_tenant_date
  ON staff_sessions (tenant_id, created_at DESC);
