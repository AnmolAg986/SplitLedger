-- Migration 037: Message Reactions
CREATE TABLE message_reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('dm', 'group')),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, message_type, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id, message_type);
