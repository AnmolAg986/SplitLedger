const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://sl:sl@localhost:5432/splitledger',
});

async function run() {
  try {
    console.log('Checking for deleted_at in groups table...');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'groups' AND column_name = 'deleted_at'
    `);
    
    if (res.rows.length === 0) {
      console.log('Adding deleted_at column...');
      await pool.query('ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE');
      console.log('Added successfully.');
    } else {
      console.log('Already exists.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
