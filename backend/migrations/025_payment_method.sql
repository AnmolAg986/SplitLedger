-- Migration 025: Payment Method Linking
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_ref TEXT;
