-- Migration 029: Expense Subcategories
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subcategory TEXT;
