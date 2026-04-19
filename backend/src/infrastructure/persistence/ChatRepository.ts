import { pool } from '../../config/db';

export class ChatRepository {

  static async sendMessage(senderId: string, receiverId: string, content: string) {
    const res = await pool.query(
      `INSERT INTO direct_messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, receiverId, content]
    );
    return res.rows[0];
  }

  static async getConversation(userId1: string, userId2: string, limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT dm.*, s.display_name as sender_name, r.display_name as receiver_name
       FROM direct_messages dm
       JOIN users s ON dm.sender_id = s.id
       JOIN users r ON dm.receiver_id = r.id
       WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1)
       ORDER BY dm.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, limit, offset]
    );
    // Return in chronological order
    return res.rows.reverse();
  }

  static async markAsRead(userId: string, friendId: string) {
    await pool.query(
      `UPDATE direct_messages
       SET is_read = true
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
      [userId, friendId]
    );
  }

  static async getUnreadCounts(userId: string) {
    const res = await pool.query(
      `SELECT sender_id, COUNT(*) as unread_count
       FROM direct_messages
       WHERE receiver_id = $1 AND is_read = false
       GROUP BY sender_id`,
      [userId]
    );
    return res.rows;
  }
}
