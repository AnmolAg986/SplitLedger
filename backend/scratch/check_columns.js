const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://sl:sl@localhost:5432/splitledger'
});

async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'groups'");
    console.log(JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
