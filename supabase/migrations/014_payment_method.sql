-- Ödeme yöntemi kolonunu ekle
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
