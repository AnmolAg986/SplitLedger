import { pool } from '../../config/db';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationRepository {
  static async create(
    userId: string, 
    type: string, 
    title: string, 
    body: string, 
    entityType?: string, 
    entityId?: string
  ): Promise<Notification> {
    const res = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, title, body, entityType, entityId]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      body: r.body,
      entityType: r.entity_type,
      entityId: r.entity_id,
      isRead: r.is_read,
      createdAt: r.created_at
    };
  }

  static async getForUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const res = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      body: r.body,
      entityType: r.entity_type,
      entityId: r.entity_id,
      isRead: r.is_read,
      createdAt: r.created_at
    }));
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const res = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return res.rows[0].count;
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [userId]
    );
  }

  static async delete(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }
}
