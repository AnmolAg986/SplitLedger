-- Migration 028: Group Roles & Permissions
-- The role column already exists (001_initial_schema.sql) with DEFAULT 'member'.
-- This migration enforces the 4-tier role system: owner | admin | member | viewer
-- and promotes existing group creators to 'owner'.

-- Promote the oldest member (creator) of each group to 'owner' if no owner exists
UPDATE group_members gm
SET role = 'owner'
FROM (
  SELECT DISTINCT ON (group_id) group_id, user_id
  FROM group_members
  WHERE status = 'accepted'
  ORDER BY group_id, joined_at ASC
) oldest
WHERE gm.group_id = oldest.group_id
  AND gm.user_id = oldest.user_id
  AND NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = gm.group_id AND role = 'owner'
  );

-- Add constraint if not already present (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_role_check'
  ) THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_role_check
      CHECK (role IN ('owner','admin','member','viewer'));
  END IF;
END $$;
