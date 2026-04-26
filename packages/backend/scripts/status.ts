import { pool } from '../src/config/db';
import * as fs from 'fs';
import * as path from 'path';

async function status() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    // Check if migrations table exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    let appliedFiles = new Set<string>();
    
    if (checkTable.rows[0].exists) {
      const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
      appliedFiles = new Set(applied.map(r => r.filename));
    }

    console.log('\n--- Migration Status ---');
    console.log('Status\t\tMigration');
    console.log('----------------------------------------');
    
    let pendingCount = 0;
    
    for (const file of files) {
      if (appliedFiles.has(file)) {
        console.log(`[APPLIED]\t${file}`);
      } else {
        console.log(`[PENDING]\t${file}`);
        pendingCount++;
      }
    }
    
    console.log('----------------------------------------');
    console.log(`Total: ${files.length} | Applied: ${appliedFiles.size} | Pending: ${pendingCount}\n`);
    
  } catch (err) {
    console.error('Failed to get migration status:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

status();
