-- Remove NOT NULL constraint on email to allow phone-only users
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add phone_number column
ALTER TABLE users ADD COLUMN phone_number TEXT UNIQUE;

-- Enforce that a user must have at least one identifier
ALTER TABLE users ADD CONSTRAINT chk_email_or_phone CHECK (email IS NOT NULL OR phone_number IS NOT NULL);
