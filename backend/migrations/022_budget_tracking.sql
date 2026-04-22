-- Migration 022: Budget Tracking
CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES groups(id) ON DELETE SET NULL,  -- null = personal
  category    TEXT,             -- null = total budget
  amount      NUMERIC(12,2) NOT NULL,
  period      TEXT NOT NULL,    -- 'monthly' | 'weekly' | 'yearly'
  starts_at   DATE NOT NULL,
  last_alert_level INT DEFAULT 0, -- 0, 80, or 100
  last_alerted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
