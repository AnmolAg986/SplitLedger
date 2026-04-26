ALTER TABLE groups ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_members ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted';
