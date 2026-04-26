-- ============================================================
-- Migration 010: Advanced Chat Features
-- ============================================================

-- Add Advanced Features to direct_messages
ALTER TABLE direct_messages 
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_users UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN NOT NULL DEFAULT false;

-- Group Messages (Persisted)
CREATE TABLE IF NOT EXISTS group_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_edited    BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ,
  is_deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  deleted_for_users UUID[] NOT NULL DEFAULT '{}',
  delivered_to UUID[] NOT NULL DEFAULT '{}',
  read_by      UUID[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages (group_id, created_at DESC);
