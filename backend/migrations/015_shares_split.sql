-- Migration 015: Add shares to expense splits
-- Add shares column to expense_splits to support share-based splitting

ALTER TABLE expense_splits ADD COLUMN shares NUMERIC(10, 2) DEFAULT 1;

-- If we need to drop it later, the rollback would be:
-- ALTER TABLE expense_splits DROP COLUMN shares;
