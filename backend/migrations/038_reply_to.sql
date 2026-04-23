-- Migration 038: Reply-To for Direct and Group Messages
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES direct_messages(id);
ALTER TABLE group_messages  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES group_messages(id);
