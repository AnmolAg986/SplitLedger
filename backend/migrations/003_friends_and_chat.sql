-- ============================================================
-- Migration 003: Friendships & Direct Messages
-- ============================================================

-- Friendships (bidirectional, always stored with smaller UUID first)
CREATE TABLE friendships (
  user_id_1          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'pending',
  requested_by       UUID NOT NULL REFERENCES users(id),
  spending_streak    INTEGER NOT NULL DEFAULT 0,
  last_interaction   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id_1, user_id_2),
  CONSTRAINT chk_friend_order CHECK (user_id_1 < user_id_2),
  CONSTRAINT chk_valid_status CHECK (status IN ('pending', 'accepted', 'blocked'))
);

CREATE INDEX idx_friendships_user1 ON friendships (user_id_1);
CREATE INDEX idx_friendships_user2 ON friendships (user_id_2);

-- Direct Messages
CREATE TABLE direct_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_conversation ON direct_messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);
CREATE INDEX idx_dm_unread ON direct_messages (receiver_id, is_read) WHERE is_read = false;

-- Allow expenses without a group (for 1:1 friend expenses)
ALTER TABLE expenses ALTER COLUMN group_id DROP NOT NULL;
