import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { createVerifiedUser, loginAs } from './factories';
import { pool } from '../config/db';

describe('Expenses API', () => {
  let token: string;
  let user1: Awaited<ReturnType<typeof createVerifiedUser>>;
  let user2: Awaited<ReturnType<typeof createVerifiedUser>>;
  let groupId: string;

  beforeEach(async () => {
    user1 = await createVerifiedUser();
    user2 = await createVerifiedUser();

    token = await loginAs(app, user1);

    // Create group with both members
    const groupRes = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Expense Test Group', type: 'trip', memberIds: [user2.id] });

    groupId = groupRes.body.id;
  });

  it('POST /expenses — creates equal split, returns 201 with splits in DB', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId,
        description: 'Dinner',
        amount: 100,
        currency: 'USD',
        splitType: 'equal',
        participants: [{ userId: user1.id }, { userId: user2.id }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(Number(res.body.amount)).toBe(100);

    // Verify splits stored correctly in DB
    const splits = await pool.query(
      'SELECT user_id, amount FROM expense_splits WHERE expense_id = $1',
      [res.body.id]
    );
    expect(splits.rows).toHaveLength(2);
    expect(Number(splits.rows.find((s: any) => s.user_id === user1.id)?.amount)).toBe(50);
    expect(Number(splits.rows.find((s: any) => s.user_id === user2.id)?.amount)).toBe(50);
  });

  it('GET /groups/:id/expenses — lists expenses for the group', async () => {
    await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId,
        description: 'Lunch',
        amount: 60,
        currency: 'USD',
        splitType: 'equal',
        participants: [{ userId: user1.id }, { userId: user2.id }],
      });

    const res = await request(app)
      .get(`/groups/${groupId}/expenses`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /expenses — returns 400 when participants list is empty', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId,
        description: 'No participants',
        amount: 50,
        currency: 'USD',
        splitType: 'equal',
        participants: [],
      });

    expect(res.status).toBe(400);
  });

  it('GET /expenses/:id — gets a single expense by ID', async () => {
    const create = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId,
        description: 'Coffee',
        amount: 40,
        currency: 'USD',
        splitType: 'equal',
        participants: [{ userId: user1.id }, { userId: user2.id }],
      });

    const res = await request(app)
      .get(`/expenses/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Coffee');
  });
});
