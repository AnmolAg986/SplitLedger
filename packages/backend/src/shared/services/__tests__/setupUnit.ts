// Unit test setup: set required env vars before any module loads env.ts
// This prevents process.exit(1) when env validation runs without a real DB.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://sl:sl@localhost:5432/splitledger_test';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-10-chars-here';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-10-chars';
