-- Migration 017: Add receipt attachments to expenses
-- Support uploading receipts (images/PDFs) to individual expenses

CREATE TABLE expense_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id   UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_type    TEXT NOT NULL, -- MIME type e.g. image/jpeg, application/pdf
  file_size    INTEGER,       -- in bytes
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_expense_attachments_expense_id ON expense_attachments(expense_id);
