const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://sl:sl@localhost:5432/splitledger'
});

async function seed() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    const files = [
      '001_initial_schema.sql',
      '002_email_verification.sql',
      '003_friends_and_chat.sql',
      '004_add_phone_auth.sql',
      '005_add_expense_features.sql',
      '006_add_group_due_day.sql'
    ];

    for (const f of files) {
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
      console.log(`Marked as applied: ${f}`);
    }
    console.log('Seeding complete');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

seed();
