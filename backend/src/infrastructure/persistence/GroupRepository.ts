import { pool } from '../../config/db';

export class GroupRepository {

  static async createGroup(name: string, type: string, createdBy: string, memberIds: string[], defaultDueDay?: number, description?: string, avatarUrl?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const groupRes = await client.query(
        `INSERT INTO groups (name, type, created_by, default_due_day, description, avatar_url) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, type, createdBy, defaultDueDay || null, description || null, avatarUrl || null]
      );
      const group = groupRes.rows[0];

      // Add creator as admin
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [group.id, createdBy]
      );

      // Add other members
      for (const memberId of memberIds) {
        if (memberId !== createdBy) {
          await client.query(
            `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')
             ON CONFLICT DO NOTHING`,
            [group.id, memberId]
          );
        }
      }

      await client.query('COMMIT');
      return group;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getGroups(userId: string) {
    const res = await pool.query(
      `SELECT g.id, g.name, g.type, g.created_at, g.is_archived, g.avatar_url,
              COUNT(gm2.user_id) as member_count
       FROM "groups" g
       JOIN group_members gm ON gm.group_id = g.id
       JOIN group_members gm2 ON gm2.group_id = g.id
       WHERE gm.user_id = $1 AND g.deleted_at IS NULL
       GROUP BY g.id, g.name, g.type, g.created_at, g.is_archived, g.avatar_url
       ORDER BY g.is_archived ASC, g.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async getGroupDetail(groupId: string) {
    const groupRes = await pool.query(
      `SELECT * FROM groups WHERE id = $1 AND deleted_at IS NULL`, [groupId]
    );
    if (groupRes.rows.length === 0) return null;

    const membersRes = await pool.query(
      `SELECT u.id, u.display_name, u.email, u.avatar_url, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, u.display_name`,
      [groupId]
    );

    return {
      ...groupRes.rows[0],
      members: membersRes.rows
    };
  }

  static async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async getGroupBalances(groupId: string) {
    // For each pair of users, calculate net balance
    const res = await pool.query(
      `SELECT
         e.paid_by,
         es.user_id as owes_to,
         payer.display_name as paid_by_name,
         ower.display_name as owes_name,
         SUM(es.amount) as amount
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       JOIN users payer ON e.paid_by = payer.id
       JOIN users ower ON es.user_id = ower.id
       WHERE e.group_id = $1
         AND e.deleted_at IS NULL
         AND es.is_paid = false
         AND es.user_id != e.paid_by
       GROUP BY e.paid_by, es.user_id, payer.display_name, ower.display_name`,
      [groupId]
    );
    return res.rows;
  }

  static async getGroupExpenses(groupId: string, userId: string) {
    const res = await pool.query(
      `SELECT e.id, e.description, e.amount, e.currency, e.paid_by, e.split_type,
              e.category, e.created_at,
              payer.display_name as paid_by_name,
              COALESCE(
                (SELECT json_agg(json_build_object('id', u.id, 'display_name', u.display_name))
                 FROM expense_splits es
                 JOIN users u ON u.id = es.user_id
                 WHERE es.expense_id = e.id),
                '[]'::json
              ) as participants,
              CASE 
                WHEN e.paid_by = $2 THEN
                  NOT EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id != $2 AND es2.is_paid = false)
                ELSE 
                  EXISTS (SELECT 1 FROM expense_splits es3 WHERE es3.expense_id = e.id AND es3.user_id = $2 AND es3.is_paid = true)
                  OR NOT EXISTS (SELECT 1 FROM expense_splits es4 WHERE es4.expense_id = e.id AND es4.user_id = $2)
              END as is_settled,
              EXISTS (SELECT 1 FROM expense_splits es5 WHERE es5.expense_id = e.id AND es5.user_id = $2) as is_involved
       FROM expenses e
       JOIN users payer ON e.paid_by = payer.id
       WHERE e.group_id = $1 AND e.deleted_at IS NULL
       ORDER BY e.created_at DESC`,
      [groupId, userId]
    );
    return res.rows;
  }

  static async getMonthlyLeaderboard(groupId: string) {
    const res = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url,
              SUM(e.amount) as total_paid,
              MAX(e.created_at) as last_contribution
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.group_id = $1
         AND e.deleted_at IS NULL
       GROUP BY u.id, u.display_name, u.avatar_url
       HAVING SUM(e.amount) > 0
       ORDER BY total_paid DESC`,
      [groupId]
    );
    return res.rows;
  }

  static async getMemberStats(groupId: string) {
    const res = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url,
              COALESCE(paid.total_paid, 0) as total_paid,
              COALESCE(paid.expense_count, 0) as expenses_created,
              COALESCE(split.total_share, 0) as total_share
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN (
         SELECT paid_by, SUM(amount) as total_paid, COUNT(id) as expense_count
         FROM expenses
         WHERE group_id = $1 AND deleted_at IS NULL
         GROUP BY paid_by
       ) paid ON paid.paid_by = u.id
       LEFT JOIN (
         SELECT es.user_id, SUM(es.amount) as total_share
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id
         WHERE e.group_id = $1 AND e.deleted_at IS NULL
         GROUP BY es.user_id
       ) split ON split.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY total_paid DESC`,
      [groupId]
    );
    return res.rows;
  }

  static async getGroupMemberRole(groupId: string, userId: string): Promise<string | null> {
    const res = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    return res.rows[0]?.role || null;
  }

  static async addMember(groupId: string, userId: string) {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT DO NOTHING`,
      [groupId, userId]
    );
  }

  static async removeMember(groupId: string, userId: string) {
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
  }

  static async changeMemberRole(groupId: string, userId: string, role: string) {
    await pool.query(
      `UPDATE group_members SET role = $3 WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId, role]
    );
  }

  static async archiveGroup(groupId: string, isArchived: boolean) {
    await pool.query(
      `UPDATE groups SET is_archived = $2 WHERE id = $1`,
      [groupId, isArchived]
    );
  }

  static async findByInviteToken(token: string) {
    const res = await pool.query(
      `SELECT * FROM groups WHERE invite_token = $1`, [token]
    );
    return res.rows[0] || null;
  }

  static async updateGroupDetails(groupId: string, data: { name?: string; description?: string; avatarUrl?: string }) {
    const fields = [];
    const values = [];
    if (data.name) { fields.push(`name = $${fields.length + 1}`); values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${fields.length + 1}`); values.push(data.description); }
    if (data.avatarUrl !== undefined) { fields.push(`avatar_url = $${fields.length + 1}`); values.push(data.avatarUrl); }
    
    if (fields.length === 0) return;
    values.push(groupId);
    await pool.query(
      `UPDATE groups SET ${fields.join(', ')} WHERE id = $${values.length}`,
      values
    );
  }

  static async deleteGroup(groupId: string, userId: string) {
    await pool.query(
      `UPDATE groups SET deleted_at = now() 
       WHERE id = $1 AND created_at IS NOT NULL`, // simplified check, controller handles role
      [groupId]
    );
    // Also soft-delete all expenses in this group
    await pool.query(
      `UPDATE expenses SET deleted_at = now() WHERE group_id = $1 AND deleted_at IS NULL`,
      [groupId]
    );
  }
}
