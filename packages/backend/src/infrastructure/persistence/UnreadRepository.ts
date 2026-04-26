import { pool } from '../../config/db';

export class UnreadRepository {
  static async increment(userId: string, entityType: string, entityId: string | null, section: string, amount: number = 1) {
    const res = await pool.query(
      `INSERT INTO unread_counts (user_id, entity_type, entity_id, section, count, last_activity)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id, entity_type, entity_id, section) 
       DO UPDATE SET count = unread_counts.count + $5, last_activity = now()
       RETURNING *`,
      [userId, entityType, entityId, section, amount]
    );
    return res.rows[0];
  }

  static async markAsRead(userId: string, entityType: string, entityId: string | null, section: string) {
    const res = await pool.query(
      `UPDATE unread_counts
       SET count = 0
       WHERE user_id = $1 AND entity_type = $2 AND entity_id IS NOT DISTINCT FROM $3 AND section = $4 AND count > 0
       RETURNING *`,
      [userId, entityType, entityId, section]
    );
    return res.rows[0];
  }

  static async getUnreadCountsForUser(userId: string) {
    const res = await pool.query(
      `SELECT entity_type, entity_id, section, count, last_activity
       FROM unread_counts
       WHERE user_id = $1 AND count > 0`,
      [userId]
    );
    return res.rows;
  }
}
