-- Migration 018: Add exchange_rate to expenses for multi-currency support
-- Store the exchange rate at the time of transaction (historical rate preservation)
-- exchange_rate = how many units of base_currency per 1 unit of expense currency
-- e.g., if group base is INR and expense is in USD, exchange_rate = 83.5

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12, 6) DEFAULT 1.0;

-- base_amount already exists from prior schema, but ensure it is set correctly
-- base_amount = amount * exchange_rate (in group's base currency)
-- Update existing rows to have exchange_rate = 1 (same currency assumption)
UPDATE expenses SET exchange_rate = 1.0 WHERE exchange_rate IS NULL;
