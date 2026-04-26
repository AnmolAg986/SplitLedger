import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://sl:sl@localhost:5432/splitledger_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-10-chars-here';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-10-chars';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    // CRITICAL: Run one file at a time to prevent:
    // 1. Parallel clearDatabase() calls wiping each other's seed data
    // 2. Concurrent CREATE TABLE schema_migrations race condition
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
