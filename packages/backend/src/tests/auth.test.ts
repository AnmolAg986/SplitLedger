import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { createUser, createVerifiedUser } from './factories';

describe('Auth Endpoints', () => {
  it('POST /auth/register — creates account and returns OTP message', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        identifier: `newuser${Date.now()}@example.com`,
        password: 'securePass1',
        displayName: 'New User',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('identifier');
  });

  it('POST /auth/register — rejects duplicate identifier with 409', async () => {
    const user = await createUser({ email: `duplicate${Date.now()}@example.com` });

    const res = await request(app)
      .post('/auth/register')
      .send({
        identifier: user.email,
        password: 'securePass1',
        displayName: 'Dupe User',
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /auth/login — unverified user gets 403 UNVERIFIED_EMAIL', async () => {
    const email = `unverified${Date.now()}@example.com`;
    await request(app)
      .post('/auth/register')
      .send({ identifier: email, password: 'securePass1', displayName: 'Unverified' });

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: email, password: 'securePass1' });

    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('UNVERIFIED_EMAIL');
  });

  it('POST /auth/login — verified user gets accessToken + refreshToken', async () => {
    const user = await createVerifiedUser();

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.id).toBe(user.id);
  });

  it('POST /auth/login — wrong password returns 401', async () => {
    const user = await createVerifiedUser();

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: user.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
