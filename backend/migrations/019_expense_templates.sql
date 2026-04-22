CREATE TABLE expense_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id     UUID REFERENCES groups(id) ON DELETE CASCADE,  -- null = personal
  name         TEXT NOT NULL,
  description  TEXT,
  amount       NUMERIC(12,2),
  split_mode   TEXT,
  category     TEXT,
  participants JSONB,   -- stored participant config
  created_at   TIMESTAMPTZ DEFAULT now()
);
