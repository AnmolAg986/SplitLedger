
const { pool } = require('./src/config/db');

async function run() {
  try {
    const res = await pool.query("SELECT id, display_name FROM users WHERE display_name ILIKE $1", ['%Anmol%']);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
