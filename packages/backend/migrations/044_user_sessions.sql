CREATE TABLE user_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_id  UUID REFERENCES refresh_tokens(id) ON DELETE CASCADE,
  ip_address        INET,
  user_agent        TEXT,
  last_active       TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
