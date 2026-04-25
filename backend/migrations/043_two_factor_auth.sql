ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE two_fa_recovery_codes (
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at   TIMESTAMPTZ,
  PRIMARY KEY (user_id, code_hash)
);
