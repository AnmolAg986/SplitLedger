-- Users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  default_currency CHAR(3) NOT NULL DEFAULT 'INR',
  upi_id          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Groups
CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'other',
  base_currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group Members (with roles)
CREATE TABLE group_members (
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Expenses
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id),
  paid_by     UUID NOT NULL REFERENCES users(id),
  amount      BIGINT NOT NULL,
  currency    CHAR(3) NOT NULL,
  base_amount BIGINT NOT NULL,
  fx_rate     NUMERIC(18,8),
  description TEXT NOT NULL,
  split_type  TEXT NOT NULL,
  category    TEXT,
  receipt_url TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  version     INTEGER NOT NULL DEFAULT 1,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Expense Splits
CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  amount      BIGINT NOT NULL,
  currency    CHAR(3) NOT NULL,
  share_pct   NUMERIC(7,4),
  share_units INTEGER,
  is_paid     BOOLEAN NOT NULL DEFAULT false
);

-- Settlements
CREATE TABLE settlements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id),
  from_user   UUID NOT NULL REFERENCES users(id),
  to_user     UUID NOT NULL REFERENCES users(id),
  amount      BIGINT NOT NULL,
  currency    CHAR(3) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  upi_txn_ref TEXT,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_different_users CHECK (from_user <> to_user)
);

-- Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring Expenses
CREATE TABLE recurring_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES groups(id),
  template     JSONB NOT NULL,
  frequency    TEXT NOT NULL,
  next_run_at  TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID NOT NULL REFERENCES users(id)
);

-- Badges
CREATE TABLE user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  badge_type TEXT NOT NULL,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata   JSONB
);

-- Audit Logs
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  entity      TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES users(id),
  snapshot    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
