-- Migration 040: Chat Attachments
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
