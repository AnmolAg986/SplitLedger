CREATE TABLE expense_tags (
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,
  PRIMARY KEY (expense_id, tag)
);
