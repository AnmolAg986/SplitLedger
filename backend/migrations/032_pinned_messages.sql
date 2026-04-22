-- Migration 032: Pinned Messages / Group Announcements
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS is_pinned  BOOLEAN DEFAULT FALSE;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS pinned_by  UUID REFERENCES users(id);
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS pinned_at  TIMESTAMPTZ;

-- Index for fast pinned-message lookups
CREATE INDEX IF NOT EXISTS idx_group_messages_pinned
  ON group_messages(group_id, is_pinned)
  WHERE is_pinned = TRUE;
