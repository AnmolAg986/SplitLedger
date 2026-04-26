-- Migration 030: Group Activity Feed
CREATE TABLE IF NOT EXISTS group_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id),
  event_type  TEXT NOT NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_activity_group_created
  ON group_activity(group_id, created_at DESC);
