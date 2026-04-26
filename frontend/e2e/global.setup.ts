import { chromium, FullConfig } from '@playwright/test';
import { Client } from 'pg';

async function globalSetup(config: FullConfig) {
  const connectionString = process.env.DATABASE_URL || 'postgres://sl:sl@localhost:5432/splitledger_test';
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != 'schema_migrations'
    `);
    
    if (rows.length > 0) {
      const tables = rows.map((r: any) => `"${r.table_name}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${tables} CASCADE;`);
      console.log('Database truncated successfully for E2E tests.');
    }
  } catch (error) {
    console.error('Failed to clear database during E2E setup:', error);
  } finally {
    await client.end();
  }
}

export default globalSetup;
