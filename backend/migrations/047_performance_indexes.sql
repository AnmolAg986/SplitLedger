-- Most queries filter by user + status
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_created_at ON expenses(paid_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id_is_paid ON expense_splits(user_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_settlements_from_to_created_at ON settlements(from_user, to_user, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_receiver_created_at ON direct_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id_created_at ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read_created_at ON notifications(user_id, is_read, created_at DESC);

-- Full-text search on expenses
CREATE INDEX IF NOT EXISTS idx_expenses_description_fts ON expenses USING gin(to_tsvector('english', description));
