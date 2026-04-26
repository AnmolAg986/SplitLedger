const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://sl:sl@localhost:5432/splitledger'
});

async function migrate() {
  try {
    console.log('Adding default_due_day column to groups table...');
    await pool.query(`
      ALTER TABLE groups 
      ADD COLUMN IF NOT EXISTS default_due_day INTEGER 
      CHECK (default_due_day >= 1 AND default_due_day <= 31);
    `);
    console.log('Column added successfully.');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
