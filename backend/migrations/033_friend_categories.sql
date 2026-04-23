-- Migration 033: Friend Categories
ALTER TABLE friendships ADD COLUMN category TEXT DEFAULT 'other';
-- 'family' | 'work' | 'roommate' | 'travel' | 'other'
