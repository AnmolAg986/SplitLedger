import { pool } from '../../config/db';

export class AnalyticsRepository {
  static async getPersonalAnalytics(userId: string) {
    // 1. Monthly Spend Trend (last 12 months)
    const monthlyRes = await pool.query(
      `SELECT to_char(date_trunc('month', e.created_at), 'YYYY-MM') as month,
              SUM(es.amount) as total
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE es.user_id = $1 AND e.deleted_at IS NULL
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`,
      [userId]
    );

    // 2. Category Breakdown
    const categoryRes = await pool.query(
      `SELECT COALESCE(e.category, 'General') as name,
              SUM(es.amount) as value
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE es.user_id = $1 AND e.deleted_at IS NULL
       GROUP BY name
       ORDER BY value DESC`,
      [userId]
    );

    // 3. Top Expense Partners
    const partnersRes = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url, SUM(es.amount) as amount
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       JOIN users u ON (CASE WHEN e.paid_by = $1 THEN es.user_id ELSE e.paid_by END) = u.id
       WHERE (e.paid_by = $1 OR es.user_id = $1) 
         AND e.paid_by != es.user_id 
         AND e.deleted_at IS NULL
         AND u.id != $1
       GROUP BY u.id, u.display_name, u.avatar_url
       ORDER BY amount DESC
       LIMIT 5`,
      [userId]
    );

    // 4. Settle Rate
    const settleRes = await pool.query(
      `SELECT 
         COUNT(*) as total_count,
         COUNT(*) FILTER (WHERE es.is_paid = true) as settled_count
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE es.user_id = $1 AND e.paid_by != $1 AND e.deleted_at IS NULL`,
      [userId]
    );

    // 5. Average Expense Amount
    const avgRes = await pool.query(
      `SELECT AVG(es.amount) as average
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE es.user_id = $1 AND e.deleted_at IS NULL`,
      [userId]
    );

    // 6. Biggest Single Expense
    const biggestRes = await pool.query(
      `SELECT e.id, e.description, es.amount as my_share, e.created_at
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE es.user_id = $1 AND e.deleted_at IS NULL
       ORDER BY es.amount DESC
       LIMIT 1`,
      [userId]
    );

    // 7. Longest Streak
    const streakRes = await pool.query(
      `SELECT MAX(streak_count) as longest_streak
       FROM friendships
       WHERE user1_id = $1 OR user2_id = $1`,
      [userId]
    );

    return {
      monthlySpend: monthlyRes.rows.reverse(),
      categoryBreakdown: categoryRes.rows,
      topPartners: partnersRes.rows,
      settleRate: {
        total: parseInt(settleRes.rows[0]?.total_count || '0'),
        settled: parseInt(settleRes.rows[0]?.settled_count || '0')
      },
      averageExpense: parseFloat(avgRes.rows[0]?.average || '0'),
      biggestExpense: biggestRes.rows[0] || null,
      longestStreak: parseInt(streakRes.rows[0]?.longest_streak || '0')
    };
  }

  static async getGroupAnalytics(groupId: string) {
    // 1. Monthly Group Spend (stacked bar by member)
    // We group by month and paid_by. We'll join with users to get display_name.
    const monthlyRes = await pool.query(
      `SELECT to_char(date_trunc('month', e.created_at), 'YYYY-MM') as month,
              u.display_name as member,
              SUM(e.amount) as total
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.group_id = $1 AND e.deleted_at IS NULL
       GROUP BY month, u.display_name
       ORDER BY month ASC
       LIMIT 60`,
      [groupId]
    );

    // Transform monthlyRes into an array of { month, "User A": 100, "User B": 200 }
    const monthlySpendData = monthlyRes.rows.reduce((acc: any[], row: any) => {
      let monthItem = acc.find(item => item.month === row.month);
      if (!monthItem) {
        monthItem = { month: row.month };
        acc.push(monthItem);
      }
      monthItem[row.member] = parseFloat(row.total);
      return acc;
    }, []);

    // 2. Category Distribution
    const categoryRes = await pool.query(
      `SELECT COALESCE(category, 'General') as name, SUM(amount) as value
       FROM expenses
       WHERE group_id = $1 AND deleted_at IS NULL
       GROUP BY name
       ORDER BY value DESC`,
      [groupId]
    );

    // 3. Member Contribution Ratio
    const contributionRes = await pool.query(
      `SELECT u.display_name as name, SUM(e.amount) as value
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.group_id = $1 AND e.deleted_at IS NULL
       GROUP BY u.display_name
       ORDER BY value DESC`,
      [groupId]
    );

    // 4. Settlement Velocity (avg time to settle in hours)
    const velocityRes = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (es.updated_at - e.created_at))) as avg_seconds
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = $1 AND es.is_paid = true AND e.deleted_at IS NULL AND es.user_id != e.paid_by`,
      [groupId]
    );
    const avgSeconds = parseFloat(velocityRes.rows[0]?.avg_seconds || '0');
    const avgDays = avgSeconds > 0 ? (avgSeconds / 86400).toFixed(1) : '0';

    // 5. Balance History (simplified to total group spend accumulation over time)
    // To do true balance over time is complex, so we'll do cumulative spend over time.
    const historyRes = await pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
              SUM(amount) as daily_total
       FROM expenses
       WHERE group_id = $1 AND deleted_at IS NULL
       GROUP BY date
       ORDER BY date ASC`,
      [groupId]
    );

    let cumulative = 0;
    const balanceHistory = historyRes.rows.map((r: any) => {
      cumulative += parseFloat(r.daily_total);
      return { date: r.date, total: cumulative };
    });

    // 6. Calendar Heatmap
    // Just date and count/amount
    const heatmapRes = await pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
              COUNT(*) as count,
              SUM(amount) as total
       FROM expenses
       WHERE group_id = $1 AND deleted_at IS NULL
       GROUP BY date
       ORDER BY date ASC`,
      [groupId]
    );

    return {
      monthlySpend: monthlySpendData,
      categoryDistribution: categoryRes.rows.map(r => ({ name: r.name, value: parseFloat(r.value) })),
      contributionRatio: contributionRes.rows.map(r => ({ name: r.name, value: parseFloat(r.value) })),
      settlementVelocityDays: avgDays,
      balanceHistory,
      heatmap: heatmapRes.rows.map(r => ({ date: r.date, count: parseInt(r.count), total: parseFloat(r.total) }))
    };
  }

  static async exportPersonalExpenses(userId: string, from?: string, to?: string) {
    let query = `
      SELECT e.id, e.description, e.amount as total_amount, es.amount as my_share, 
             e.category, e.created_at, e.paid_by
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE es.user_id = $1 AND e.deleted_at IS NULL
    `;
    const params: any[] = [userId];

    if (from) {
      params.push(from);
      query += ` AND e.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND e.created_at <= $${params.length}`;
    }

    query += ` ORDER BY e.created_at DESC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  static async exportGroupExpenses(groupId: string) {
    const res = await pool.query(`
      SELECT e.id, e.description, e.amount, e.category, e.created_at, 
             u.display_name as paid_by_name
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = $1 AND e.deleted_at IS NULL
      ORDER BY e.created_at DESC
    `, [groupId]);
    return res.rows;
  }
}
