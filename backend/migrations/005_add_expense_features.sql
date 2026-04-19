ALTER TABLE expenses ADD COLUMN due_date TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
