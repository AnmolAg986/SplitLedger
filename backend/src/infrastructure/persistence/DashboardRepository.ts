import { pool } from '../../config/db';

export class DashboardRepository {
  /**
   * Calculate exact net balances by querying expense_splits.
   * Total Owed (to user) = Amount someone else owes you on an expense you paid.
   * Total Owe (by user) = Amount you owe someone else on an expense they paid.
   */
  static async getMetrics(userId: string) {
    const client = await pool.connect();
    try {
      // Amount people owe the user (user paid, someone else is in the split)
      const owedResult = await client.query(`
        SELECT COALESCE(SUM(es.amount), 0) as total_owed
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.paid_by = $1 
          AND es.user_id != $1 
          AND es.is_paid = false
          AND e.deleted_at IS NULL
      `, [userId]);

      // Amount the user owes others (someone else paid, user is in the split)
      const oweResult = await client.query(`
        SELECT COALESCE(SUM(es.amount), 0) as total_owe
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.paid_by != $1 
          AND es.user_id = $1 
          AND es.is_paid = false
          AND e.deleted_at IS NULL
      `, [userId]);

      const totalOwed = parseInt(owedResult.rows[0].total_owed, 10);
      const totalOwe = parseInt(oweResult.rows[0].total_owe, 10);

      return {
        totalBalance: totalOwed - totalOwe,
        totalOwed,
        totalOwe
      };
    } finally {
      client.release();
    }
  }

  static async hasOnboarded(userId: string) {
    const client = await pool.connect();
    try {
      const groups = await client.query(`SELECT 1 FROM group_members WHERE user_id = $1 LIMIT 1`, [userId]);
      const expenses = await client.query(`
        SELECT 1 FROM expense_splits es 
        JOIN expenses e ON es.expense_id = e.id 
        WHERE (es.user_id = $1 OR e.paid_by = $1) AND e.deleted_at IS NULL 
        LIMIT 1
      `, [userId]);
      
      return {
        hasFriendsOrGroups: (groups.rowCount ?? 0) > 0,
        hasExpenses: (expenses.rowCount ?? 0) > 0
      };
    } finally {
      client.release();
    }
  }

  static async getSmartInsights(userId: string) {
    const client = await pool.connect();
    try {
      // Top 3 people you owe — include user_id for deep linking
      const oweResult = await client.query(`
        SELECT u.id as user_id, u.display_name, SUM(es.amount) as amount 
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON e.paid_by = u.id
        WHERE es.user_id = $1 AND e.paid_by != $1 AND es.is_paid = false AND e.deleted_at IS NULL
        GROUP BY u.id, u.display_name
        ORDER BY amount DESC LIMIT 3
      `, [userId]);

      // Top 3 people who owe you — include user_id for deep linking
      const owedResult = await client.query(`
        SELECT u.id as user_id, u.display_name, SUM(es.amount) as amount 
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON es.user_id = u.id
        WHERE e.paid_by = $1 AND es.user_id != $1 AND es.is_paid = false AND e.deleted_at IS NULL
        GROUP BY u.id, u.display_name
        ORDER BY amount DESC LIMIT 3
      `, [userId]);

      // Total spent this month
      const spentResult = await client.query(`
        SELECT COALESCE(SUM(es.amount), 0) as amount
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE es.user_id = $1 AND e.deleted_at IS NULL
        AND date_trunc('month', e.created_at) = date_trunc('month', now())
      `, [userId]);

      return {
        topOwe: oweResult.rows,
        topOwed: owedResult.rows,
        spentThisMonth: parseInt(spentResult.rows[0].amount || '0', 10)
      };
    } finally {
      client.release();
    }
  }

  static async getRecentActivityMini(userId: string) {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT e.id, e.description, e.amount, e.created_at, u.display_name as paid_by_name
        FROM expenses e
        JOIN users u ON e.paid_by = u.id
        WHERE e.deleted_at IS NULL AND (
          e.paid_by = $1 OR
          EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = $1)
        )
        ORDER BY e.created_at DESC
        LIMIT 3
      `, [userId]);
      return res.rows;
    } finally {
      client.release();
    }
  }

  static async getFullActivity(userId: string) {
    const client = await pool.connect();
    try {
      const activities = await client.query(`
        SELECT e.description, e.amount, e.currency, e.created_at, u.display_name as paid_by_name
        FROM expenses e
        JOIN users u ON e.paid_by = u.id
        WHERE e.deleted_at IS NULL AND (
          e.paid_by = $1 OR 
          EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id AND es.user_id = $1)
        )
        ORDER BY e.created_at DESC
        LIMIT 50
      `, [userId]);

      return activities.rows;
    } finally {
      client.release();
    }
  }
}
