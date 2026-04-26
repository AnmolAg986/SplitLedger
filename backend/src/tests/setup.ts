import { beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../config/db';
import * as fs from 'fs';
import * as path from 'path';

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedFiles = new Set(applied.map(r => r.filename));

    for (const file of files) {
      if (appliedFiles.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

export async function clearDatabase() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name != 'schema_migrations'`
    );

    if (rows.length > 0) {
      const tables = rows.map(r => `"${r.table_name}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${tables} CASCADE`);
    }
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Safety Check: Integration tests must run against a test database');
  }
  await runMigrations();
});

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await pool.end();
});
