import { pool } from '../../config/db';
import { UnreadRepository } from './UnreadRepository';

export class ChatRepository {

  static async sendMessage(senderId: string, receiverId: string, content: string) {
    const res = await pool.query(
      `INSERT INTO direct_messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, receiverId, content]
    );
    await UnreadRepository.increment(receiverId, 'friend', senderId, 'chat');
    return res.rows[0];
  }

  static async getConversation(userId1: string, userId2: string, limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT dm.*, s.display_name as sender_name, r.display_name as receiver_name
       FROM direct_messages dm
       JOIN users s ON dm.sender_id = s.id
       JOIN users r ON dm.receiver_id = r.id
       WHERE ((dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1))
         AND NOT ($1 = ANY(dm.deleted_for_users))
       ORDER BY dm.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, limit, offset]
    );
    // Return in chronological order
    return res.rows.reverse();
  }

  static async editMessage(messageId: string, senderId: string, content: string) {
    const res = await pool.query(
      `UPDATE direct_messages 
       SET content = $1, is_edited = true, updated_at = now() 
       WHERE id = $2 AND sender_id = $3 AND created_at > now() - interval '30 minutes'
       RETURNING *`,
      [content, messageId, senderId]
    );
    if (!res.rows[0]) throw new Error('Cannot edit message after 30 minutes');
    return res.rows[0];
  }

  static async deleteForMe(messageId: string, userId: string) {
    await pool.query(
      `UPDATE direct_messages
       SET deleted_for_users = array_append(deleted_for_users, $1)
       WHERE id = $2 AND NOT ($1 = ANY(deleted_for_users))`,
      [userId, messageId]
    );
  }

  static async deleteForEveryone(messageId: string, senderId: string) {
    const res = await pool.query(
      `UPDATE direct_messages
       SET content = '', is_deleted_for_everyone = true, updated_at = now()
       WHERE id = $1 AND sender_id = $2 AND created_at > now() - interval '30 minutes'
       RETURNING *`,
      [messageId, senderId]
    );
    if (!res.rows[0]) throw new Error('Cannot delete message for everyone after 30 minutes');
    return res.rows[0];
  }

  static async markAsRead(userId: string, friendId: string) {
    await pool.query(
      `UPDATE direct_messages
       SET is_read = true, is_delivered = true
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
      [userId, friendId]
    );
    await UnreadRepository.markAsRead(userId, 'friend', friendId, 'chat');
  }

  static async markAsDelivered(receiverId: string) {
    await pool.query(
      `UPDATE direct_messages
       SET is_delivered = true
       WHERE receiver_id = $1 AND is_delivered = false`,
      [receiverId]
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

  // --- Group Messages ---
  static async sendGroupMessage(groupId: string, senderId: string, content: string) {
    const res = await pool.query(
      `WITH ins AS (
         INSERT INTO group_messages (group_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *
       )
       SELECT ins.*, u.display_name AS sender_name
       FROM ins
       JOIN users u ON ins.sender_id = u.id`,
      [groupId, senderId, content]
    );
    const membersRes = await pool.query(`SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2`, [groupId, senderId]);
    for (const member of membersRes.rows) {
      await UnreadRepository.increment(member.user_id, 'group', groupId, 'chat');
    }
    return res.rows[0];
  }

  static async getGroupConversation(groupId: string, userId: string, limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT gm.*, s.display_name as sender_name
       FROM group_messages gm
       JOIN users s ON gm.sender_id = s.id
       WHERE gm.group_id = $1 AND NOT ($2 = ANY(gm.deleted_for_users))
       ORDER BY gm.created_at DESC
       LIMIT $3 OFFSET $4`,
      [groupId, userId, limit, offset]
    );
    return res.rows.reverse();
  }

  static async editGroupMessage(messageId: string, senderId: string, content: string) {
    const res = await pool.query(
      `UPDATE group_messages 
       SET content = $1, is_edited = true, updated_at = now() 
       WHERE id = $2 AND sender_id = $3 AND created_at > now() - interval '30 minutes'
       RETURNING *`,
      [content, messageId, senderId]
    );
    if (!res.rows[0]) throw new Error('Cannot edit group message after 30 minutes');
    return res.rows[0];
  }

  static async deleteGroupForMe(messageId: string, userId: string) {
    await pool.query(
      `UPDATE group_messages
       SET deleted_for_users = array_append(deleted_for_users, $1)
       WHERE id = $2 AND NOT ($1 = ANY(deleted_for_users))`,
      [userId, messageId]
    );
  }

  static async deleteGroupForEveryone(messageId: string, senderId: string) {
    const res = await pool.query(
      `UPDATE group_messages
       SET content = '', is_deleted_for_everyone = true, updated_at = now()
       WHERE id = $1 AND sender_id = $2 AND created_at > now() - interval '30 minutes'
       RETURNING *`,
      [messageId, senderId]
    );
    if (!res.rows[0]) throw new Error('Cannot delete group message for everyone after 30 minutes');
    return res.rows[0];
  }

  static async markGroupMessageDelivered(groupId: string, userId: string) {
    await pool.query(
      `UPDATE group_messages
       SET delivered_to = array_append(delivered_to, $1)
       WHERE group_id = $2 AND NOT ($1 = ANY(delivered_to))`,
      [userId, groupId]
    );
  }

  static async markGroupMessageRead(groupId: string, userId: string) {
    await pool.query(
      `UPDATE group_messages
       SET read_by = array_append(read_by, $1),
           delivered_to = CASE WHEN NOT ($1 = ANY(delivered_to)) THEN array_append(delivered_to, $1) ELSE delivered_to END
       WHERE group_id = $2 AND NOT ($1 = ANY(read_by))`,
      [userId, groupId]
    );
    await UnreadRepository.markAsRead(userId, 'group', groupId, 'chat');
  }
}
