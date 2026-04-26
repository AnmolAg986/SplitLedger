const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://sl:sl@localhost:5432/splitledger'
});

async function checkUser() {
  try {
    const res = await pool.query('SELECT id, email, phone_number FROM users WHERE email = $1', ['agrawalanmol215@gmail.com']);
    console.log('User found:', res.rows);
    if (res.rows.length === 0) {
      const all = await pool.query('SELECT email FROM users LIMIT 10');
      console.log('Existing emails:', all.rows);
    }
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await pool.end();
  }
}

checkUser();
