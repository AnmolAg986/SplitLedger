import { pool } from '../../config/db';

export class FriendRepository {

  /** Normalize pair so user_id_1 < user_id_2 */
  private static ordered(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  static async addFriend(fromUserId: string, toUserId: string) {
    const [u1, u2] = this.ordered(fromUserId, toUserId);
    const res = await pool.query(
      `INSERT INTO friendships (user_id_1, user_id_2, status, requested_by)
       VALUES ($1, $2, 'pending', $3)
       ON CONFLICT (user_id_1, user_id_2) DO NOTHING
       RETURNING *`,
      [u1, u2, fromUserId]
    );
    return res.rows[0] || null;
  }

  static async acceptFriend(currentUserId: string, friendId: string) {
    const [u1, u2] = this.ordered(currentUserId, friendId);
    const res = await pool.query(
      `UPDATE friendships
       SET status = 'accepted'
       WHERE user_id_1 = $1 AND user_id_2 = $2
         AND status = 'pending'
         AND requested_by != $3
       RETURNING *`,
      [u1, u2, currentUserId]
    );
    return res.rows[0] || null;
  }

  static async removeFriend(userId: string, friendId: string) {
    const [u1, u2] = this.ordered(userId, friendId);
    await pool.query(
      `DELETE FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [u1, u2]
    );
  }

  static async getFriends(userId: string) {
    const res = await pool.query(
      `SELECT
         u.id, u.display_name, u.email, u.avatar_url,
         f.status, 
         CASE 
           WHEN f.last_interaction IS NULL THEN 0
           WHEN EXTRACT(EPOCH FROM (now() - f.last_interaction)) / 86400 >= 2 THEN 0
           ELSE f.spending_streak 
         END as spending_streak,
         f.last_interaction, f.requested_by,
         CASE WHEN f.user_id_1 = $1 THEN f.nickname_1 ELSE f.nickname_2 END as nickname
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.user_id_1 = $1 THEN f.user_id_2
         ELSE f.user_id_1
       END
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
         AND f.status = 'accepted'
       ORDER BY COALESCE(CASE WHEN f.user_id_1 = $1 THEN f.nickname_1 ELSE f.nickname_2 END, u.display_name)`,
      [userId]
    );
    return res.rows;
  }

  static async getPendingRequests(userId: string) {
    const res = await pool.query(
      `SELECT
         u.id, u.display_name, u.email, u.avatar_url,
         f.created_at, f.requested_by
       FROM friendships f
       JOIN users u ON u.id = f.requested_by
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
         AND f.status = 'pending'
         AND f.requested_by != $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async searchUsers(query: string, currentUserId: string) {
    const res = await pool.query(
      `SELECT id, display_name, email, avatar_url
       FROM users
       WHERE id != $1
         AND (display_name ILIKE $2 OR email ILIKE $2)
         AND is_verified = true
       LIMIT 20`,
      [currentUserId, `%${query}%`]
    );
    return res.rows;
  }

  static async getFriendBalance(userId: string, friendId: string) {
    // What friend owes user (user paid, friend is in split)
    const owedRes = await pool.query(
      `SELECT COALESCE(SUM(es.amount), 0) as amount
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.paid_by = $1
         AND es.user_id = $2
         AND es.is_paid = false
         AND e.deleted_at IS NULL`,
      [userId, friendId]
    );

    // What user owes friend (friend paid, user is in split)
    const oweRes = await pool.query(
      `SELECT COALESCE(SUM(es.amount), 0) as amount
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.paid_by = $2
         AND es.user_id = $1
         AND es.is_paid = false
         AND e.deleted_at IS NULL`,
      [userId, friendId]
    );

    const theyOweYou = parseInt(owedRes.rows[0].amount, 10);
    const youOweThem = parseInt(oweRes.rows[0].amount, 10);

    return {
      theyOweYou,
      youOweThem,
      netBalance: theyOweYou - youOweThem
    };
  }

  static async getFriendExpenses(userId: string, friendId: string) {
    const res = await pool.query(
      `SELECT DISTINCT e.id, e.description, e.amount, e.currency, e.paid_by,
              e.split_type, e.category, e.created_at,
              payer.display_name as paid_by_name,
              CASE 
                WHEN e.paid_by = $1 THEN
                  NOT EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = $2 AND es2.is_paid = false)
                ELSE 
                  EXISTS (SELECT 1 FROM expense_splits es3 WHERE es3.expense_id = e.id AND es3.user_id = $1 AND es3.is_paid = true)
              END as is_settled
       FROM expenses e
       JOIN users payer ON e.paid_by = payer.id
       JOIN expense_splits es ON es.expense_id = e.id
       WHERE e.deleted_at IS NULL
         AND (
           (e.paid_by = $1 AND es.user_id = $2)
           OR (e.paid_by = $2 AND es.user_id = $1)
         )
       ORDER BY e.created_at DESC`,
      [userId, friendId]
    );
    return res.rows;
  }

  static async getFriendshipStats(userId: string, friendId: string) {
    // Total spent together (Total sum of expenses where both are involved and e.amount is the total expense amount)
    const spentRes = await pool.query(
      `SELECT COALESCE(SUM(e.amount), 0) as total_amount
       FROM expenses e
       WHERE e.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM expense_splits es1 WHERE es1.expense_id = e.id AND (es1.user_id = $1 OR e.paid_by = $1))
         AND EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND (es2.user_id = $2 OR e.paid_by = $2))`,
      [userId, friendId]
    );

    // Most common category
    const catRes = await pool.query(
      `SELECT e.category, COUNT(*) as count
       FROM expenses e
       WHERE e.deleted_at IS NULL
         AND e.category IS NOT NULL
         AND EXISTS (SELECT 1 FROM expense_splits es1 WHERE es1.expense_id = e.id AND (es1.user_id = $1 OR e.paid_by = $1))
         AND EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND (es2.user_id = $2 OR e.paid_by = $2))
       GROUP BY e.category
       ORDER BY count DESC
       LIMIT 1`,
      [userId, friendId]
    );

    return {
      totalSpentTogether: parseFloat(spentRes.rows[0]?.total_amount || '0'),
      mostCommonCategory: catRes.rows[0]?.category || null
    };
  }

  static async getMutualGroups(userId: string, friendId: string) {
    const res = await pool.query(
      `SELECT g.id, g.name, g.avatar_url
       FROM groups g
       JOIN group_members gm1 ON g.id = gm1.group_id
       JOIN group_members gm2 ON g.id = gm2.group_id
       WHERE gm1.user_id = $1 AND gm2.user_id = $2
         AND g.is_archived = false`,
      [userId, friendId]
    );
    return res.rows;
  }

  static async getMostGenerousFriend(userId: string) {
    // Friend who paid the most for the user's splits
    const res = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url,
              SUM(es.amount) as total_paid_for_you
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       JOIN users u ON e.paid_by = u.id
       WHERE es.user_id = $1
         AND e.paid_by != $1
         AND e.deleted_at IS NULL
       GROUP BY u.id, u.display_name, u.avatar_url
       ORDER BY total_paid_for_you DESC
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  static async getSpendingStreaks(userId: string) {
    const res = await pool.query(
      `SELECT
         u.id, u.display_name, u.avatar_url,
         f.spending_streak, f.last_interaction
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.user_id_1 = $1 THEN f.user_id_2
         ELSE f.user_id_1
       END
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
         AND f.status = 'accepted'
         AND f.spending_streak > 0
         AND EXTRACT(EPOCH FROM (now() - f.last_interaction)) / 86400 < 2
       ORDER BY f.spending_streak DESC`,
      [userId]
    );
    return res.rows;
  }

  static async updateStreak(userId1: string, userId2: string) {
    const [u1, u2] = this.ordered(userId1, userId2);
    const res = await pool.query(
      `SELECT spending_streak, last_interaction FROM friendships
       WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [u1, u2]
    );
    if (res.rows.length === 0) return;

    const { last_interaction, spending_streak } = res.rows[0];
    const now = new Date();
    let newStreak = 1;

    if (last_interaction) {
      const lastDate = new Date(last_interaction);
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, no change
        return;
      } else if (diffDays === 1) {
        // Consecutive day — increment!
        newStreak = spending_streak + 1;
      }
      // diffDays > 1 → streak resets to 1
    }

    await pool.query(
      `UPDATE friendships
       SET spending_streak = $3, last_interaction = now()
       WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [u1, u2, newStreak]
    );
  }

  static async getFriendshipStatus(userId: string, friendId: string) {
    const [u1, u2] = this.ordered(userId, friendId);
    const res = await pool.query(
      `SELECT * FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [u1, u2]
    );
    return res.rows[0] || null;
  }

  static async setNickname(userId: string, friendId: string, nickname: string | null) {
    const [u1, u2] = this.ordered(userId, friendId);
    const targetCol = (u1 === userId) ? 'nickname_1' : 'nickname_2';
    
    await pool.query(
      `UPDATE friendships SET ${targetCol} = $3 
       WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [u1, u2, nickname]
    );
  }

  static async getRecentFriends(userId: string, limit: number = 6) {
    const res = await pool.query(
      `SELECT DISTINCT u.id, u.display_name, u.avatar_url, f.last_interaction,
              CASE WHEN f.user_id_1 = $1 THEN f.nickname_1 ELSE f.nickname_2 END as nickname
       FROM friendships f
       JOIN users u ON u.id = (CASE WHEN f.user_id_1 = $1 THEN f.user_id_2 ELSE f.user_id_1 END)
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
         AND f.status = 'accepted'
         AND f.last_interaction IS NOT NULL
       ORDER BY f.last_interaction DESC
       LIMIT $2`,
      [userId, limit]
    );
    return res.rows;
  }
}
