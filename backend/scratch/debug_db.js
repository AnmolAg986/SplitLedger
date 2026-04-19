
import { pool } from '../src/config/db';

async function debug() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node debug_db.js <userId>');
    process.exit(1);
  }

  console.log('Checking for userId:', userId);

  // Check metrics
  const owed = await pool.query(`
    SELECT e.id, e.description, es.user_id, es.amount, es.is_paid
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.paid_by = $1 
      AND es.user_id != $1 
      AND e.deleted_at IS NULL
  `, [userId]);

  console.log('--- Splits others owe this user ---');
  console.table(owed.rows);

  // Check splits user owes
  const owe = await pool.query(`
    SELECT e.id, e.description, e.paid_by, es.amount, es.is_paid
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.paid_by != $1 
      AND es.user_id = $1 
      AND e.deleted_at IS NULL
  `, [userId]);

  console.log('--- Splits user owes others ---');
  console.table(owe.rows);

  // Check insights
  const insights = await pool.query(`
    SELECT u.display_name, SUM(es.amount) as amount 
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    JOIN users u ON es.user_id = u.id
    WHERE e.paid_by = $1 AND es.user_id != $1 AND es.is_paid = false AND e.deleted_at IS NULL
    GROUP BY u.display_name
  `, [userId]);
  console.log('--- People who owe this user (Summary) ---');
  console.table(insights.rows);

  process.exit(0);
}

debug();
