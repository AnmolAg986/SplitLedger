-- Migration 023: Settlement History
CREATE TABLE settlement_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id  UUID REFERENCES settlements(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,   -- 'created' | 'disputed' | 'confirmed' | 'reversed'
  actor_id       UUID REFERENCES users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
