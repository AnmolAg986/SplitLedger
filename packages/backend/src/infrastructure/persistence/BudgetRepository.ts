import { pool } from '../../config/db';

export class BudgetRepository {
  static async createBudget(data: {
    userId: string;
    groupId?: string;
    category?: string;
    amount: number;
    period: string;
    startsAt: string;
  }) {
    const res = await pool.query(
      `INSERT INTO budgets (user_id, group_id, category, amount, period, starts_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.userId, data.groupId || null, data.category || null, data.amount, data.period, data.startsAt]
    );
    return res.rows[0];
  }

  static async getPersonalBudgets(userId: string) {
    const res = await pool.query(
      `SELECT * FROM budgets WHERE user_id = $1 AND group_id IS NULL ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async getGroupBudgets(groupId: string) {
    const res = await pool.query(
      `SELECT * FROM budgets WHERE group_id = $1 ORDER BY created_at DESC`,
      [groupId]
    );
    return res.rows;
  }

  static async deleteBudget(id: string, userId: string) {
    // Only the creator can delete their budget
    const res = await pool.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return res.rowCount ? res.rowCount > 0 : false;
  }

  static async getSpentAmount(userId: string, groupId: string | null, category: string | null, startsAt: string, endsAt: string) {
    let query = `
      SELECT SUM(es.amount) as spent
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.deleted_at IS NULL AND e.created_at >= $1 AND e.created_at < $2
    `;
    const params: any[] = [startsAt, endsAt];

    if (groupId) {
      params.push(groupId);
      query += ` AND e.group_id = $${params.length}`;
      // In a group, total spent could be total expense amount, but for budget we track user's share?
      // Wait, if it's a group budget, do we track the entire group's spending or just user's?
      // Let's track the entire group spending if group_id is provided, otherwise user's share.
      // Wait, "Users set a monthly budget (total or per-category)". A group budget is for the whole group.
      query = `
        SELECT SUM(amount) as spent
        FROM expenses
        WHERE deleted_at IS NULL AND group_id = $3 AND created_at >= $1 AND created_at < $2
      `;
    } else {
      params.push(userId);
      query += ` AND es.user_id = $${params.length} AND e.group_id IS NULL`;
    }

    if (category) {
      params.push(category);
      // for group:
      if (groupId) {
        query += ` AND category = $4`;
      } else {
        query += ` AND e.category = $4`;
      }
    }

    const res = await pool.query(query, params);
    return parseFloat(res.rows[0]?.spent || '0');
  }

  static async getAllActiveBudgets() {
    const res = await pool.query(`SELECT * FROM budgets`);
    return res.rows;
  }

  static async updateAlertLevel(budgetId: string, level: number) {
    await pool.query(
      `UPDATE budgets SET last_alert_level = $1, last_alerted_at = now() WHERE id = $2`,
      [level, budgetId]
    );
  }
}
