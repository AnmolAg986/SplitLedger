import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function createUser(overrides: {
  id?: string;
  displayName?: string;
  email?: string;
  password?: string;
} = {}) {
  const id = overrides.id || crypto.randomUUID();
  const displayName = overrides.displayName || 'Test User';
  const email = overrides.email || `test${Date.now()}@example.com`;
  const plainPassword = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await pool.query(
    `INSERT INTO users (id, email, password_hash, display_name, is_verified)
     VALUES ($1, $2, $3, $4, false)`,
    [id, email, passwordHash, displayName]
  );

  return { id, displayName, email, password: plainPassword };
}

export async function createVerifiedUser(overrides: {
  id?: string;
  displayName?: string;
  email?: string;
  password?: string;
} = {}) {
  const user = await createUser(overrides);
  await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);
  return user;
}

export async function createGroup(ownerId: string, overrides: {
  id?: string;
  name?: string;
} = {}) {
  const id = overrides.id || crypto.randomUUID();
  const name = overrides.name || 'Test Group';

  await pool.query(
    `INSERT INTO groups (id, name, created_by) VALUES ($1, $2, $3)`,
    [id, name, ownerId]
  );

  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)`,
    [id, ownerId, 'owner', 'accepted']
  );

  return { id, name, ownerId };
}

export async function joinGroup(groupId: string, userId: string, role = 'member') {
  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)`,
    [groupId, userId, role, 'accepted']
  );
}

export async function loginAs(app: any, user: { email: string; password: string }) {
  const request = (await import('supertest')).default;
  const res = await request(app)
    .post('/auth/login')
    .send({ identifier: user.email, password: user.password });
  return res.body.accessToken as string;
}
