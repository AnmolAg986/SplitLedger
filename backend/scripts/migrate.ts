import { pool } from '../src/config/db';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Get applied migrations
    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedFiles = new Set(applied.map(r => r.filename));

    for (const file of files) {
      if (appliedFiles.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }
    console.log('All migrations processed successfully');
  } catch (err) {
    console.error('Migration process failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
