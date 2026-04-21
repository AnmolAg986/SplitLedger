-- Migration 016: Add expense comments
-- Support discussion threads on individual expenses

CREATE TABLE expense_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_expense_comments_expense_id ON expense_comments(expense_id);
