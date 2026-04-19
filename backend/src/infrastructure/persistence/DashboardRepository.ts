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
      const res = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount ELSE 0 END), 0) as total_owed,
          COALESCE(SUM(CASE WHEN e.paid_by != $1 AND es.user_id = $1 THEN es.amount ELSE 0 END), 0) as total_owe
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND es.is_paid = false
          AND e.deleted_at IS NULL
      `, [userId]);

      const totalOwed = parseFloat(res.rows[0].total_owed || '0');
      const totalOwe = parseFloat(res.rows[0].total_owe || '0');

      // Net balance at start of month
      const lastMonthRes = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount ELSE 0 END), 0) as total_owed,
          COALESCE(SUM(CASE WHEN e.paid_by != $1 AND es.user_id = $1 THEN es.amount ELSE 0 END), 0) as total_owe
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND es.is_paid = false
          AND e.deleted_at IS NULL
          AND e.created_at < date_trunc('month', now())
      `, [userId]);
      const lastOwed = parseFloat(lastMonthRes.rows[0].total_owed || '0');
      const lastOwe = parseFloat(lastMonthRes.rows[0].total_owe || '0');

      // Net balance from exactly 7 days ago
      const lastWeekRes = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount ELSE 0 END), 0) as total_owed,
          COALESCE(SUM(CASE WHEN e.paid_by != $1 AND es.user_id = $1 THEN es.amount ELSE 0 END), 0) as total_owe
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND es.is_paid = false
          AND e.deleted_at IS NULL
          AND e.created_at < now() - interval '7 days'
      `, [userId]);
      const lastWeekOwed = parseFloat(lastWeekRes.rows[0].total_owed || '0');
      const lastWeekOwe = parseFloat(lastWeekRes.rows[0].total_owe || '0');

      // 5. Settled this month
      const settledRes = await client.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM settlements
        WHERE (from_user = $1 OR to_user = $1)
          AND status = 'completed'
          AND paid_at >= date_trunc('month', now())
      `, [userId]);

      // 6. Last settled date
      const lastSettledRes = await client.query(`
        SELECT MAX(paid_at) as last_date
        FROM settlements
        WHERE (from_user = $1 OR to_user = $1)
          AND status = 'completed'
      `, [userId]);

      // 7. Balance Trend (Last 6 months)
      const trendRes = await client.query(`
        WITH months AS (
          SELECT date_trunc('month', now()) - (i || ' month')::interval as month
          FROM generate_series(0, 5) i
        )
        SELECT 
          m.month,
          COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN e.paid_by != $1 AND es.user_id = $1 THEN es.amount ELSE 0 END), 0) as balance
        FROM months m
        LEFT JOIN expenses e ON date_trunc('month', e.created_at) = m.month
        LEFT JOIN expense_splits es ON e.id = es.expense_id AND (e.paid_by = $1 OR es.user_id = $1)
        WHERE e.deleted_at IS NULL OR e.id IS NULL
        GROUP BY m.month
        ORDER BY m.month ASC
      `, [userId]);

      // 8. Seven Day Trend (Daily movements)
      const sevenDayTrendRes = await client.query(`
        WITH days AS (
          SELECT date_trunc('day', now() AT TIME ZONE 'UTC' + interval '5 hours 30 minutes') - (i || ' day')::interval as day
          FROM generate_series(0, 6) i
        )
        SELECT 
          d.day,
          COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN e.paid_by != $1 AND es.user_id = $1 THEN es.amount ELSE 0 END), 0) as balance
        FROM days d
        LEFT JOIN expenses e ON date_trunc('day', e.created_at AT TIME ZONE 'UTC' + interval '5 hours 30 minutes') = d.day
        LEFT JOIN expense_splits es ON e.id = es.expense_id AND (e.paid_by = $1 OR es.user_id = $1)
        WHERE e.deleted_at IS NULL OR e.id IS NULL
        GROUP BY d.day
        ORDER BY d.day ASC
      `, [userId]);

      // Calculate Best Month
      const sortedTrend = [...trendRes.rows].sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
      const bestMonthData = sortedTrend[0];
      const bestMonthName = bestMonthData ? new Date(bestMonthData.month).toLocaleDateString('en-IN', { month: 'short' }) : 'None';
      const bestMonthValue = bestMonthData ? parseFloat(bestMonthData.balance) : 0;

      return {
        totalBalance: totalOwed - totalOwe,
        totalOwed,
        totalOwe,
        lastMonthNetBalance: lastOwed - lastOwe,
        lastWeekNetBalance: lastWeekOwed - lastWeekOwe,
        settledThisMonth: parseFloat(settledRes.rows[0].total || '0'),
        lastSettledAt: lastSettledRes.rows[0].last_date,
        bestMonth: { name: bestMonthName, amount: bestMonthValue },
        balanceTrend: trendRes.rows.map(r => ({
          month: r.month,
          balance: parseFloat(r.balance)
        })),
        sevenDayTrend: sevenDayTrendRes.rows.map(r => ({
          day: r.day,
          balance: parseFloat(r.balance)
        }))
      };
    } catch (e) {
      console.error('[DashboardMetrics] Error:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  static async hasOnboarded(userId: string) {
    const client = await pool.connect();
    try {
      const groups = await client.query(`SELECT 1 FROM group_members WHERE user_id = $1 LIMIT 1`, [userId]);
      const friends = await client.query(`
        SELECT 1 FROM friendships 
        WHERE (user_id_1 = $1 OR user_id_2 = $1) AND status = 'accepted' 
        LIMIT 1
      `, [userId]);
      const expenses = await client.query(`
        SELECT 1 FROM expense_splits es 
        JOIN expenses e ON es.expense_id = e.id 
        WHERE (es.user_id = $1 OR e.paid_by = $1) AND e.deleted_at IS NULL 
        LIMIT 1
      `, [userId]);
      
      return {
        hasFriendsOrGroups: ((groups.rowCount ?? 0) > 0) || ((friends.rowCount ?? 0) > 0),
        hasExpenses: (expenses.rowCount ?? 0) > 0
      };
    } finally {
      client.release();
    }
  }

  static async getSmartInsights(userId: string) {
    const client = await pool.connect();
    try {
      // Net balance per person across ALL expenses (friend + group)
      // Positive net = they owe you; Negative net = you owe them
      const netResult = await client.query(`
        SELECT
          u.id as user_id,
          u.display_name,
          COALESCE(SUM(
            CASE
              WHEN e.paid_by = $1 AND es.user_id = u.id THEN es.amount
              WHEN e.paid_by = u.id AND es.user_id = $1 THEN -es.amount
              ELSE 0
            END
          ), 0) as amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON (
          u.id = CASE WHEN e.paid_by = $1 THEN es.user_id ELSE e.paid_by END
        )
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND u.id != $1
          AND es.is_paid = false
          AND e.deleted_at IS NULL
        GROUP BY u.id, u.display_name
        HAVING COALESCE(SUM(
          CASE
            WHEN e.paid_by = $1 AND es.user_id = u.id THEN es.amount
            WHEN e.paid_by = u.id AND es.user_id = $1 THEN -es.amount
            ELSE 0
          END
        ), 0) != 0
      `, [userId]);

      const topOwed = netResult.rows
        .filter((r: any) => parseFloat(r.amount) > 0)
        .map((r: any) => ({ ...r, amount: parseFloat(r.amount) }));

      const topOwe = netResult.rows
        .filter((r: any) => parseFloat(r.amount) < 0)
        .map((r: any) => ({ ...r, amount: Math.abs(parseFloat(r.amount)) }));

      return { topOwe, topOwed };
    } finally {
      client.release();
    }
  }

  static async getFocusInsight(userId: string) {
    const client = await pool.connect();
    try {
      // Find top friend balance (absolute)
      // We calculate balance excluding the current user's own share
      const friendRes = await client.query(`
        SELECT u.id, u.display_name as name, 'friend' as type,
               ABS(COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN es.amount ELSE -es.amount END), 0)) as abs_balance,
               COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN es.amount ELSE -es.amount END), 0) as balance
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON (u.id = CASE WHEN e.paid_by = $1 THEN es.user_id ELSE e.paid_by END)
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND u.id != $1
          AND es.is_paid = false
          AND e.deleted_at IS NULL
        GROUP BY u.id, u.display_name
        ORDER BY abs_balance DESC LIMIT 1
      `, [userId]);

      // Find top group balance (absolute)
      const groupRes = await client.query(`
        SELECT g.name, 'group' as type,
               ABS(COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount WHEN e.paid_by != $1 AND es.user_id = $1 THEN -es.amount ELSE 0 END), 0)) as abs_balance,
               COALESCE(SUM(CASE WHEN e.paid_by = $1 AND es.user_id != $1 THEN es.amount WHEN e.paid_by != $1 AND es.user_id = $1 THEN -es.amount ELSE 0 END), 0) as balance
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN groups g ON e.group_id = g.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND es.is_paid = false
          AND e.deleted_at IS NULL
          AND e.group_id IS NOT NULL
        GROUP BY g.id, g.name
        ORDER BY abs_balance DESC LIMIT 1
      `, [userId]);

      const friend = friendRes.rows[0];
      const group = groupRes.rows[0];

      if (!friend && !group) return null;
      
      // Select the one with larger absolute balance
      const selected = (!group || (friend && friend.abs_balance > group.abs_balance)) ? friend : group;
      
      if (selected.type === 'friend') {
        return {
          ...selected,
          reason: selected.balance > 0 ? 'has the most money owed to you' : 'is who you owe the most'
        };
      } else {
        return {
          ...selected,
          reason: selected.balance > 0 ? `You’re owed the most in ${selected.name}` : `You owe the most in ${selected.name}`
        };
      }
    } finally {
      client.release();
    }
  }

  static async getRecentActivityMini(userId: string) {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          e.id, 
          e.description, 
          e.amount, 
          e.created_at, 
          u.display_name as paid_by_name,
          g.name as group_name,
          (SELECT display_name FROM users WHERE id = (
             SELECT user_id FROM expense_splits WHERE expense_id = e.id AND user_id != e.paid_by LIMIT 1
          )) as other_party_name
        FROM expenses e
        JOIN users u ON e.paid_by = u.id
        LEFT JOIN groups g ON e.group_id = g.id
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

  static async getAdvancedInsights(userId: string) {
    const client = await pool.connect();
    try {
      // 1. Upcoming Dues (next 7 days)
      const duesRes = await client.query(`
        SELECT e.description, e.due_date, es.amount, e.paid_by as user_id, u.display_name, e.group_id
        FROM expenses e
        JOIN expense_splits es ON e.id = es.expense_id
        JOIN users u ON e.paid_by = u.id
        WHERE es.user_id = $1 
          AND es.is_paid = false
          AND e.due_date IS NOT NULL
          AND e.due_date >= now()
          AND e.due_date <= now() + interval '7 days'
          AND e.deleted_at IS NULL
        ORDER BY e.due_date ASC
      `, [userId]);

      // 2. Settlement Streak (completed in last 7 days)
      const streakRes = await client.query(`
        SELECT count(*) as count
        FROM settlements
        WHERE from_user = $1 AND status = 'completed' AND paid_at > now() - interval '7 days'
      `, [userId]);

      // 3. Pending Requests count (unique people who owe me)
      const pendingRes = await client.query(`
        SELECT count(DISTINCT es.user_id) as count
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.paid_by = $1 AND es.user_id != $1 AND es.is_paid = false AND e.deleted_at IS NULL
      `, [userId]);

      // 4. Received Reminders (in last 48h)
      const remindersRes = await client.query(`
        SELECT e.id as expense_id, e.description, es.amount, e.paid_by as user_id, u.display_name as friend_name
        FROM expenses e
        JOIN expense_splits es ON e.id = es.expense_id
        JOIN users u ON e.paid_by = u.id
        WHERE es.user_id = $1 
          AND es.is_paid = false 
          AND e.last_reminder_sent_at > now() - interval '48 hours'
          AND e.deleted_at IS NULL
        ORDER BY e.last_reminder_sent_at DESC
        LIMIT 3
      `, [userId]);

      // 5. Completion Progress (splits paid vs total in last 30 days)
      const progressRes = await client.query(`
        SELECT 
          COUNT(*) filter (WHERE es.is_paid = true) as paid,
          COUNT(*) as total
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE es.user_id = $1 AND e.created_at > now() - interval '30 days'
          AND e.deleted_at IS NULL
      `, [userId]);
      const paidCount = parseInt(progressRes.rows[0].paid || '0');
      const totalCount = parseInt(progressRes.rows[0].total || '0');
      const completionProgress = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100;

      // 6. Spending Trend (Today vs Avg of last 30 days)
      const trendRes = await client.query(`
        SELECT 
          SUM(e.amount) filter (WHERE e.created_at >= CURRENT_DATE) as today_total,
          SUM(e.amount) filter (WHERE e.created_at >= now() - interval '30 days') as month_total
        FROM expenses e
        WHERE e.paid_by = $1 AND e.deleted_at IS NULL
      `, [userId]);
      const todayTotal = parseFloat(trendRes.rows[0].today_total || '0');
      const monthTotal = parseFloat(trendRes.rows[0].month_total || '0');
      const avgDaily = monthTotal / 30;
      const spendingTrend = avgDaily > 0 ? todayTotal / avgDaily : 0;

      // 7. Get one specific nudge (Person who owes you the most NET)
      const nudgeRes = await client.query(`
        SELECT u.display_name, u.id as user_id,
               COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN es.amount ELSE -es.amount END), 0) as amount,
               MAX(EXTRACT(DAY FROM (now() - e.created_at))) as days_ago
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON (u.id = CASE WHEN e.paid_by = $1 THEN es.user_id ELSE e.paid_by END)
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND u.id != $1
          AND es.is_paid = false
          AND e.deleted_at IS NULL
        GROUP BY u.id, u.display_name
        HAVING COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN es.amount ELSE -es.amount END), 0) > 0
        ORDER BY amount DESC, days_ago DESC LIMIT 1
      `, [userId]);

      // 8. Overdue count (Net balance with someone is > 0 and has splits older than 7d)
      const overdueRes = await client.query(`
        SELECT COUNT(DISTINCT u.id) as count
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON (u.id = CASE WHEN e.paid_by = $1 THEN es.user_id ELSE e.paid_by END)
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND u.id != $1
          AND es.is_paid = false
          AND e.deleted_at IS NULL
          AND e.created_at < now() - interval '7 days'
      `, [userId]);

      // 9. Total Pending Amount (Total Volume of unsettled splits)
      const pendingVolumeRes = await client.query(`
        SELECT 
          COALESCE(SUM(es.amount), 0) as total
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND es.is_paid = false
          AND e.deleted_at IS NULL
          AND ((e.paid_by = $1 AND es.user_id != $1) OR (e.paid_by != $1 AND es.user_id = $1))
      `, [userId]);
      const totalPendingAmount = parseFloat(pendingVolumeRes.rows[0].total || '0');

      // 10. Largest Pending Amount
      const largestPendingRes = await client.query(`
        SELECT COALESCE(MAX(es.amount), 0) as max_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND es.is_paid = false
          AND e.deleted_at IS NULL
          AND ((e.paid_by = $1 AND es.user_id != $1) OR (e.paid_by != $1 AND es.user_id = $1))
      `, [userId]);

      // 11. Action Required Debts (Net balances per friend from unsettled expenses)
      const actionDebtsRes = await client.query(`
        SELECT u.id as user_id, u.display_name as name,
               COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN es.amount ELSE -es.amount END), 0) as net_amount,
               MAX(EXTRACT(DAY FROM (now() - e.created_at))) as max_days_ago
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        JOIN users u ON (u.id = CASE WHEN e.paid_by = $1 THEN es.user_id ELSE e.paid_by END)
        WHERE (e.paid_by = $1 OR es.user_id = $1)
          AND u.id != $1
          AND es.is_paid = false
          AND e.deleted_at IS NULL
        GROUP BY u.id, u.display_name
        HAVING COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN es.amount ELSE -es.amount END), 0) != 0
        ORDER BY MAX(EXTRACT(DAY FROM (now() - e.created_at))) DESC
      `, [userId]);

      return {
        upcomingDues: duesRes.rows,
        streakCount: parseInt(streakRes.rows[0]?.count || '0'),
        pendingRequestsCount: parseInt(pendingRes.rows[0]?.count || '0'),
        receivedReminders: remindersRes.rows,
        receivedRemindersCount: remindersRes.rows.length,
        completionProgress,
        spendingTrend,
        smartNudge: nudgeRes.rows[0] || null,
        overdueCount: parseInt(overdueRes.rows[0]?.count || '0'),
        oldestDebtDays: nudgeRes.rows[0] ? Math.floor(nudgeRes.rows[0].days_ago) : 0,
        totalPendingAmount,
        largestPendingAmount: parseFloat(largestPendingRes.rows[0].max_amount || '0'),
        actionRequiredDebts: actionDebtsRes.rows.map((r: any) => ({
           userId: r.user_id,
           name: r.name,
           netAmount: parseFloat(r.net_amount),
           daysAgo: Math.max(0, parseInt(r.max_days_ago || '0'))
        }))
      };
    } finally {
      client.release();
    }
  }
}
