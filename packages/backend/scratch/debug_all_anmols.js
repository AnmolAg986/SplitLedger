
const { pool } = require('../src/config/db');

async function run() {
  try {
    const res = await pool.query("SELECT id, display_name FROM users WHERE display_name ILIKE $1", ['%Anmol%']);
    console.log('Users found:', res.rows.length);
    for (const user of res.rows) {
      console.log(`\n--- Checking User: ${user.display_name} (${user.id}) ---`);
      const splits = await pool.query(`
        SELECT e.description, es.user_id, es.amount, es.is_paid, e.paid_by
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND e.deleted_at IS NULL
      `, [user.id]);
      console.table(splits.rows);

      const expenses = await pool.query(`
        SELECT id, description, amount, paid_by FROM expenses WHERE paid_by = $1 OR created_by = $1
      `, [user.id]);
      console.log('Expenses created/paid by this user:');
      console.table(expenses.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
