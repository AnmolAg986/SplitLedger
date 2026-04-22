-- Migration 031: Group Polls & Decisions
CREATE TABLE IF NOT EXISTS group_polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  creator_id  UUID REFERENCES users(id),
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,   -- [{ id, label }]
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_poll_votes (
  poll_id   UUID REFERENCES group_polls(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  voted_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_polls_group ON group_polls(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_poll_votes_poll ON group_poll_votes(poll_id);
