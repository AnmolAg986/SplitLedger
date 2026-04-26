import { pool } from '../../config/db';

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}

export class PushSubscriptionRepository {
  static async saveSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`, // In a real app we might upsert based on endpoint
      [userId, endpoint, p256dh, auth]
    );
  }

  static async findByUserId(userId: string): Promise<PushSubscription[]> {
    const res = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      createdAt: r.created_at
    }));
  }

  static async deleteByEndpoint(endpoint: string): Promise<void> {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  }
}
