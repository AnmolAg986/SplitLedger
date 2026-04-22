-- Migration 027: Recurring Settlements
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS recurring_interval TEXT;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS next_recurring_date TIMESTAMPTZ;
