-- Migration 024: Settlement Disputes
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS dispute_note TEXT;
