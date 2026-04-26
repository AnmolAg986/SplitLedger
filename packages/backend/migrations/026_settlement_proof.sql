-- Migration 026: Settlement Payment Proof
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS proof_url TEXT;
