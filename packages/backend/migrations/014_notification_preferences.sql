CREATE TABLE notification_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_on_expense     BOOLEAN DEFAULT TRUE,
  email_on_settlement  BOOLEAN DEFAULT TRUE,
  email_on_nudge       BOOLEAN DEFAULT FALSE,
  push_on_expense      BOOLEAN DEFAULT TRUE,
  push_on_chat         BOOLEAN DEFAULT TRUE,
  push_on_nudge        BOOLEAN DEFAULT TRUE,
  in_app_all           BOOLEAN DEFAULT TRUE
);
