import { pool } from '../../config/db';

export class BlockRepository {
  static async blockUser(blockerId: string, blockedId: string) {
    // Delete any pending requests between them
    await pool.query(
      `DELETE FROM pending_friends 
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [blockerId, blockedId]
    );

    // Delete friendship if exists (optional but recommended when blocking)
    await pool.query(
      `DELETE FROM friendships 
       WHERE (user_id_1 = $1 AND user_id_2 = $2)
          OR (user_id_1 = $2 AND user_id_2 = $1)`,
      [blockerId, blockedId]
    );

    await pool.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [blockerId, blockedId]
    );
  }

  static async unblockUser(blockerId: string, blockedId: string) {
    await pool.query(
      `DELETE FROM user_blocks
       WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );
  }

  static async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)`,
      [userId1, userId2]
    );
    return res.rows.length > 0;
  }

  static async getBlockedUsers(userId: string) {
    const res = await pool.query(
      `SELECT u.id, u.display_name, u.username, u.avatar_url
       FROM user_blocks b
       JOIN users u ON b.blocked_id = u.id
       WHERE b.blocker_id = $1`,
      [userId]
    );
    return res.rows;
  }
}
