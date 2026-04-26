-- Migration 036: Add Last Seen
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ;
