-- Kasa ve mutfak yazıcısı ayrı tanımlanabilsin
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kitchen_printer_model text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kitchen_printer_ip    text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address               text;
