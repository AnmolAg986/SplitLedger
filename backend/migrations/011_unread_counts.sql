-- Migration 011: Unread Counts System

CREATE TABLE unread_counts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  section       TEXT NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unread_counts_unique_idx UNIQUE NULLS NOT DISTINCT (user_id, entity_type, entity_id, section)
);

CREATE INDEX idx_unread_counts_user ON unread_counts(user_id);
