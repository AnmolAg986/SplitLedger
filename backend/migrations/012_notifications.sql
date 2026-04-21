-- Add new columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;

-- Safely rename message to body if message exists and body doesn't
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN 
    ALTER TABLE notifications RENAME COLUMN message TO body; 
  END IF; 
END $$;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Populate title for existing rows
UPDATE notifications SET title = 'Notification' WHERE title IS NULL;
ALTER TABLE notifications ALTER COLUMN title SET NOT NULL;

-- Drop metadata if exists
ALTER TABLE notifications DROP COLUMN IF EXISTS metadata;

-- Update foreign key constraint on user_id to ON DELETE CASCADE
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_time ON notifications(user_id, is_read, created_at DESC);
