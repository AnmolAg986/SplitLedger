import { pool } from '../config/db';
import 'dotenv/config';

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'groups' AND column_name = 'deleted_at'
    `);
    
    if (res.rows.length === 0) {
      console.log('Adding deleted_at to groups table...');
      await pool.query('ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE');
      console.log('Column added.');
    } else {
      console.log('deleted_at already exists.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
