import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { createVerifiedUser, loginAs } from './factories';

describe('Groups API', () => {
  let token: string;

  beforeEach(async () => {
    const user = await createVerifiedUser();
    token = await loginAs(app, user);
  });

  it('POST /groups — creates a group and returns 201', async () => {
    const res = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Trip to Hawaii', type: 'trip' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Trip to Hawaii');
  });

  it('POST /groups — returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'trip' });

    expect(res.status).toBe(400);
  });

  it('GET /groups — returns array of user groups', async () => {
    await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Roommates', type: 'home' });

    const res = await request(app)
      .get('/groups')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /groups — returns 401 without auth token', async () => {
    const res = await request(app).get('/groups');
    expect(res.status).toBe(401);
  });
});
