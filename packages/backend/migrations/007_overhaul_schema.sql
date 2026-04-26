-- Migration 007: Overhaul Schema for Advanced Features
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Groups updates
ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_groups_invite_token ON groups(invite_token);

-- Friendships updates (Nicknames)
-- nickname_1 is what user_id_1 calls user_id_2
-- nickname_2 is what user_id_2 calls user_id_1
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS nickname_1 TEXT;
ALTER TABLE friendships ADD COLUMN IF NOT EXISTS nickname_2 TEXT;

-- Index for searching users (already exists in 001 but making sure)
CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
-- Note: gin_trgm_ops requires pg_trgm extension, checking if we have it or just using B-Tree for now.
-- Let's stick to simple indexes unless needed.

-- Recurring Expenses Template Enhancement
-- (Already exists, but adding an index for the chron job)
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_run ON recurring_expenses(next_run_at) WHERE is_active = true;
