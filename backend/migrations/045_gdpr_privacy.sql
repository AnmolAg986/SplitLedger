-- Privacy policy acknowledgment tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_agreed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Scheduled hard-deletion queue (30 days after soft-delete)
CREATE TABLE IF NOT EXISTS account_deletions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT now(),
  scheduled_at TIMESTAMPTZ NOT NULL,   -- requested_at + 30 days
  executed_at  TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
